import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const QUICKBOOKS_BASE_URL = "https://quickbooks.api.intuit.com/v3";
const QUICKBOOKS_SANDBOX_URL = "https://sandbox-quickbooks.api.intuit.com/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuickBooksConfig {
  realmId: string;
  accessToken: string;
  baseUrl: string;
}

async function getQuickBooksConfig(supabase: any, userId: string): Promise<QuickBooksConfig | null> {
  try {
    const { data: credentials } = await supabase
      .from("integration_credentials")
      .select("access_token, company_id, is_test_mode, token_expires_at")
      .eq("dealer_id", userId)
      .eq("integration_type", "quickbooks")
      .eq("is_active", true)
      .single();

    if (!credentials || !credentials.access_token || !credentials.company_id) {
      return null;
    }

    const isExpired = credentials.token_expires_at
      ? new Date(credentials.token_expires_at) < new Date()
      : true;

    if (isExpired) {
      return null;
    }

    return {
      realmId: credentials.company_id,
      accessToken: credentials.access_token,
      baseUrl: credentials.is_test_mode ? QUICKBOOKS_SANDBOX_URL : QUICKBOOKS_BASE_URL,
    };
  } catch (error) {
    console.error("Error getting QuickBooks config:", error);
    return null;
  }
}

async function makeQuickBooksRequest(
  config: QuickBooksConfig,
  method: string,
  endpoint: string,
  body?: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = `${config.baseUrl}/company/${config.realmId}/${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.Fault?.Error?.[0]?.Message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const config = await getQuickBooksConfig(supabase, user.id);

    if (!config) {
      return new Response(
        JSON.stringify({ error: "QuickBooks not configured or token expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { action, entity_type, entity_id, data: requestData } = await req.json();

    const startTime = Date.now();
    let result;

    switch (action) {
      case "sync_customer":
        {
          const qbCustomer = {
            DisplayName: requestData.name,
            PrimaryEmailAddr: requestData.email ? { Address: requestData.email } : undefined,
            PrimaryPhone: requestData.phone ? { FreeFormNumber: requestData.phone } : undefined,
          };

          result = await makeQuickBooksRequest(config, "POST", "customer?minorversion=65", qbCustomer);

          if (result.success && entity_id) {
            await supabase
              .from("customer_products")
              .update({ quickbooks_customer_id: result.data?.Customer?.Id })
              .eq("id", entity_id);
          }
        }
        break;

      case "sync_invoice":
        {
          if (!requestData.qb_customer_id) {
            return new Response(
              JSON.stringify({ error: "Customer must be synced first" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          const subtotal = requestData.total_price - (requestData.taxes || 0);

          const qbInvoice = {
            CustomerRef: {
              value: requestData.qb_customer_id,
            },
            Line: [
              {
                Amount: subtotal,
                DetailType: "SalesItemLineDetail",
                SalesItemLineDetail: {
                  ItemRef: {
                    value: "1",
                    name: "Services",
                  },
                  Qty: 1,
                  UnitPrice: subtotal,
                },
                Description: `Warranty ${requestData.contract_number}`,
              },
            ],
            TxnTaxDetail: {
              TotalTax: requestData.taxes || 0,
            },
            DocNumber: requestData.contract_number,
          };

          result = await makeQuickBooksRequest(config, "POST", "invoice?minorversion=65", qbInvoice);

          if (result.success && entity_id) {
            await supabase
              .from("warranties")
              .update({ quickbooks_invoice_id: result.data?.Invoice?.Id })
              .eq("id", entity_id);
          }
        }
        break;

      case "sync_payment":
        {
          if (!requestData.qb_customer_id || !requestData.qb_invoice_id) {
            return new Response(
              JSON.stringify({ error: "Customer and Invoice must be synced first" }),
              {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }

          const qbPayment = {
            CustomerRef: {
              value: requestData.qb_customer_id,
            },
            TotalAmt: requestData.amount,
            TxnDate: requestData.payment_date,
            Line: [
              {
                Amount: requestData.amount,
                LinkedTxn: [
                  {
                    TxnId: requestData.qb_invoice_id,
                    TxnType: "Invoice",
                  },
                ],
              },
            ],
          };

          result = await makeQuickBooksRequest(config, "POST", "payment?minorversion=65", qbPayment);

          if (result.success && entity_id) {
            await supabase
              .from("payments")
              .update({ quickbooks_payment_id: result.data?.Payment?.Id })
              .eq("id", entity_id);
          }
        }
        break;

      case "query":
        {
          const query = requestData.query;
          const encodedQuery = encodeURIComponent(query);
          result = await makeQuickBooksRequest(
            config,
            "GET",
            `query?query=${encodedQuery}&minorversion=65`
          );
        }
        break;

      case "get_company_info":
        {
          result = await makeQuickBooksRequest(config, "GET", "companyinfo/0?minorversion=65");
        }
        break;

      case "sync_all_unsynced":
        {
          const synced = { customers: 0, invoices: 0, payments: 0 };
          const errors: string[] = [];

          const { data: warranties } = await supabase
            .from("warranties")
            .select("*")
            .eq("dealer_id", user.id)
            .is("quickbooks_invoice_id", null)
            .limit(50);

          if (warranties) {
            for (const warranty of warranties) {
              const subtotal = warranty.total_price - (warranty.taxes || 0);

              const qbInvoice = {
                CustomerRef: {
                  value: warranty.quickbooks_customer_id || "1",
                },
                Line: [
                  {
                    Amount: subtotal,
                    DetailType: "SalesItemLineDetail",
                    SalesItemLineDetail: {
                      ItemRef: {
                        value: "1",
                        name: "Services",
                      },
                      Qty: 1,
                      UnitPrice: subtotal,
                    },
                    Description: `Warranty ${warranty.contract_number}`,
                  },
                ],
                DocNumber: warranty.contract_number,
              };

              const invoiceResult = await makeQuickBooksRequest(
                config,
                "POST",
                "invoice?minorversion=65",
                qbInvoice
              );

              if (invoiceResult.success) {
                await supabase
                  .from("warranties")
                  .update({ quickbooks_invoice_id: invoiceResult.data?.Invoice?.Id })
                  .eq("id", warranty.id);
                synced.invoices++;
              } else {
                errors.push(`Warranty ${warranty.contract_number}: ${invoiceResult.error}`);
              }
            }
          }

          result = { success: true, data: { synced, errors } };
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    const processingTime = Date.now() - startTime;

    await supabase.rpc("log_integration_event", {
      p_dealer_id: user.id,
      p_integration_type: "quickbooks",
      p_event_type: action,
      p_status: result.success ? "success" : "failed",
      p_request_data: { action, entity_type, entity_id },
      p_response_data: result.success ? result.data : {},
      p_error_message: result.error,
      p_processing_time_ms: processingTime,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify(result.data),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in sync-quickbooks function:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
