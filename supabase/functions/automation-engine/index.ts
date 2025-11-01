import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, any>;
  conditions: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  actions: Array<{
    type: string;
    [key: string]: any;
  }>;
}

interface ExecutionContext {
  workflow: Workflow;
  trigger_data: Record<string, any>;
  organization_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { trigger_type, trigger_data, workflow_id } = await req.json();

    console.log(`Automation engine triggered: ${trigger_type}`, trigger_data);

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from("automation_executions")
      .insert({
        workflow_id,
        organization_id: trigger_data.organization_id,
        trigger_data,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError) throw executionError;

    let workflow: Workflow;

    if (workflow_id) {
      // Execute specific workflow
      const { data: wf, error: wfError } = await supabase
        .from("automation_workflows")
        .select("*")
        .eq("id", workflow_id)
        .eq("is_active", true)
        .single();

      if (wfError || !wf) {
        throw new Error("Workflow not found or inactive");
      }

      workflow = wf as Workflow;
    } else {
      // Find matching workflows by trigger type
      const { data: workflows, error: wfError } = await supabase
        .from("automation_workflows")
        .select("*")
        .eq("trigger_type", trigger_type)
        .eq("is_active", true)
        .eq("organization_id", trigger_data.organization_id);

      if (wfError) throw wfError;

      if (!workflows || workflows.length === 0) {
        console.log(`No active workflows found for trigger: ${trigger_type}`);
        return new Response(
          JSON.stringify({ success: true, message: "No workflows to execute" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      workflow = workflows[0] as Workflow;
    }

    // Execute workflow
    const context: ExecutionContext = {
      workflow,
      trigger_data,
      organization_id: trigger_data.organization_id,
    };

    const result = await executeWorkflow(supabase, context, execution.id);

    // Update execution record
    await supabase
      .from("automation_executions")
      .update({
        status: result.success ? "completed" : "failed",
        actions_executed: result.actions_executed,
        actions_failed: result.actions_failed,
        error_message: result.error,
        completed_at: new Date().toISOString(),
        duration_ms: result.duration_ms,
      })
      .eq("id", execution.id);

    return new Response(
      JSON.stringify({
        success: result.success,
        execution_id: execution.id,
        actions_executed: result.actions_executed.length,
        actions_failed: result.actions_failed.length,
        duration_ms: result.duration_ms,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Automation engine error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function executeWorkflow(
  supabase: any,
  context: ExecutionContext,
  executionId: string
): Promise<{
  success: boolean;
  actions_executed: Array<any>;
  actions_failed: Array<any>;
  error?: string;
  duration_ms: number;
}> {
  const startTime = Date.now();
  const actionsExecuted: Array<any> = [];
  const actionsFailed: Array<any> = [];

  try {
    // Check conditions
    if (context.workflow.conditions && context.workflow.conditions.length > 0) {
      const conditionsMet = evaluateConditions(
        context.workflow.conditions,
        context.trigger_data
      );

      if (!conditionsMet) {
        await logAutomation(
          supabase,
          context.organization_id,
          context.workflow.id,
          executionId,
          "info",
          "Workflow conditions not met - skipping execution"
        );

        return {
          success: true,
          actions_executed: [],
          actions_failed: [],
          duration_ms: Date.now() - startTime,
        };
      }
    }

    // Execute actions sequentially
    for (const action of context.workflow.actions) {
      try {
        await executeAction(supabase, context, action, executionId);
        actionsExecuted.push({ action: action.type, success: true });

        await logAutomation(
          supabase,
          context.organization_id,
          context.workflow.id,
          executionId,
          "info",
          `Action executed: ${action.type}`,
          { action }
        );
      } catch (error: any) {
        console.error(`Action failed: ${action.type}`, error);
        actionsFailed.push({
          action: action.type,
          error: error.message,
        });

        await logAutomation(
          supabase,
          context.organization_id,
          context.workflow.id,
          executionId,
          "error",
          `Action failed: ${action.type}`,
          { action, error: error.message }
        );

        // Continue with next action unless critical
        if (action.critical) {
          throw error;
        }
      }
    }

    return {
      success: actionsFailed.length === 0,
      actions_executed: actionsExecuted,
      actions_failed: actionsFailed,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      actions_executed: actionsExecuted,
      actions_failed: actionsFailed,
      error: error.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

function evaluateConditions(
  conditions: Array<{ field: string; operator: string; value: any }>,
  data: Record<string, any>
): boolean {
  return conditions.every((condition) => {
    const fieldValue = getNestedValue(data, condition.field);

    switch (condition.operator) {
      case "eq":
        return fieldValue === condition.value;
      case "ne":
        return fieldValue !== condition.value;
      case "gt":
        return fieldValue > condition.value;
      case "gte":
        return fieldValue >= condition.value;
      case "lt":
        return fieldValue < condition.value;
      case "lte":
        return fieldValue <= condition.value;
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case "contains":
        return String(fieldValue).includes(String(condition.value));
      default:
        return false;
    }
  });
}

function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

async function executeAction(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>,
  executionId: string
): Promise<void> {
  switch (action.type) {
    case "send_email":
      await sendEmail(supabase, context, action);
      break;

    case "send_sms":
      await sendSMS(supabase, context, action);
      break;

    case "create_notification":
      await createNotification(supabase, context, action);
      break;

    case "generate_invoices":
      await generateInvoices(supabase, context, action);
      break;

    case "update_warranty_status":
      await updateWarrantyStatus(supabase, context, action);
      break;

    case "create_task":
      await createTask(supabase, context, action);
      break;

    case "webhook":
      await callWebhook(context, action);
      break;

    default:
      console.warn(`Unknown action type: ${action.type}`);
  }
}

async function sendEmail(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  const { trigger_data } = context;

  // Get recipient
  let recipientEmail: string;
  let recipientName: string;

  if (action.to === "customer" && trigger_data.customer) {
    recipientEmail = trigger_data.customer.email;
    recipientName = `${trigger_data.customer.first_name} ${trigger_data.customer.last_name}`;
  } else if (action.to === "admin") {
    // Get org admin email
    const { data: admins } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("organization_id", context.organization_id)
      .in("role", ["master", "admin", "franchisee_admin"])
      .limit(1);

    if (!admins || admins.length === 0) {
      throw new Error("No admin found for organization");
    }

    recipientEmail = admins[0].email;
    recipientName = admins[0].full_name;
  } else {
    recipientEmail = action.email;
    recipientName = action.name || "User";
  }

  // Queue email
  await supabase.from("email_queue").insert({
    organization_id: context.organization_id,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    subject: action.subject || "Notification",
    template_name: action.template,
    template_data: {
      ...trigger_data,
      recipient_name: recipientName,
    },
    priority: action.priority || "normal",
    status: "pending",
  });
}

async function sendSMS(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  // Check if SMS is enabled for user
  if (action.condition === "sms_enabled") {
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("sms_enabled")
      .eq("user_id", context.trigger_data.user_id)
      .eq("organization_id", context.organization_id)
      .single();

    if (!prefs?.sms_enabled) {
      console.log("SMS not enabled for user - skipping");
      return;
    }
  }

  // Call SMS edge function
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-sms`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: context.trigger_data.customer?.phone || action.phone,
      message: action.message,
    }),
  });

  if (!response.ok) {
    throw new Error(`SMS send failed: ${response.statusText}`);
  }
}

async function createNotification(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  const { trigger_data } = context;

  // Determine recipients
  let recipients: string[] = [];

  if (action.roles) {
    // Get users by roles
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .eq("organization_id", context.organization_id)
      .in("role", action.roles);

    recipients = users?.map((u: any) => u.id) || [];
  } else if (trigger_data.user_id) {
    recipients = [trigger_data.user_id];
  }

  // Create notifications for each recipient
  for (const recipientId of recipients) {
    await supabase.from("notifications").insert({
      recipient_id: recipientId,
      type: "in_app",
      title: action.title || "Notification",
      body: action.message,
      priority: action.priority || "medium",
      status: "pending",
      metadata: trigger_data,
    });
  }
}

async function generateInvoices(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  // This would integrate with your invoicing system
  console.log("Generating invoices...", action);

  // Call invoice generation edge function
  const response = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-monthly-invoices`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        organization_id: context.organization_id,
        period: action.period || "monthly",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Invoice generation failed: ${response.statusText}`);
  }
}

async function updateWarrantyStatus(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  const warrantyId = context.trigger_data.warranty_id || action.warranty_id;

  await supabase
    .from("warranties")
    .update({ status: action.status })
    .eq("id", warrantyId)
    .eq("organization_id", context.organization_id);
}

async function createTask(
  supabase: any,
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  // Create a task/todo item
  await supabase.from("tasks").insert({
    organization_id: context.organization_id,
    title: action.title,
    description: action.description,
    assigned_to: action.assigned_to,
    due_date: action.due_date,
    priority: action.priority || "medium",
    related_type: context.workflow.trigger_type,
    related_id: context.trigger_data.id,
  });
}

async function callWebhook(
  context: ExecutionContext,
  action: Record<string, any>
): Promise<void> {
  const response = await fetch(action.url, {
    method: action.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...action.headers,
    },
    body: JSON.stringify(context.trigger_data),
  });

  if (!response.ok) {
    throw new Error(`Webhook call failed: ${response.statusText}`);
  }
}

async function logAutomation(
  supabase: any,
  organizationId: string,
  workflowId: string,
  executionId: string,
  level: string,
  message: string,
  data?: Record<string, any>
): Promise<void> {
  await supabase.from("automation_logs").insert({
    organization_id: organizationId,
    workflow_id: workflowId,
    execution_id: executionId,
    level,
    message,
    data: data || {},
  });
}
