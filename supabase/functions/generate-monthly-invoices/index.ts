import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WarrantyTransaction {
  id: string;
  warranty_id: string;
  organization_id: string;
  warranty_total_price: number;
  commission_percentage: number;
  commission_amount: number;
  transaction_date: string;
  billing_status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const year = lastMonth.getFullYear();
    const month = lastMonth.getMonth() + 1;

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .eq('type', 'franchisee')
      .eq('status', 'active');

    if (orgsError) throw orgsError;

    const results = [];

    for (const org of organizations || []) {
      const { data: transactions, error: transError } = await supabase
        .from('warranty_transactions')
        .select('*')
        .eq('organization_id', org.id)
        .eq('billing_status', 'pending')
        .gte('transaction_date', periodStart.toISOString())
        .lte('transaction_date', periodEnd.toISOString());

      if (transError) {
        console.error(`Error fetching transactions for ${org.name}:`, transError);
        continue;
      }

      if (!transactions || transactions.length === 0) {
        results.push({
          organization: org.name,
          status: 'skipped',
          reason: 'No transactions',
        });
        continue;
      }

      const subtotal = transactions.reduce(
        (sum: number, t: WarrantyTransaction) => sum + t.commission_amount,
        0
      );

      const { data: taxSettings } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('organization_id', org.id)
        .maybeSingle();

      let taxes = 0;
      if (taxSettings) {
        if (taxSettings.apply_gst) {
          taxes += subtotal * (taxSettings.gst_rate / 100);
        }
        if (taxSettings.apply_qst) {
          taxes += subtotal * (taxSettings.qst_rate / 100);
        }
        if (taxSettings.apply_hst) {
          taxes += subtotal * (taxSettings.hst_rate / 100);
        }
      }

      const totalAmount = subtotal + taxes;

      const invoiceNumber = `INV-${year}${month.toString().padStart(2, '0')}-${org.id.substring(0, 8).toUpperCase()}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);

      const { data: invoice, error: invoiceError } = await supabase
        .from('franchise_invoices')
        .insert({
          franchisee_organization_id: org.id,
          invoice_number: invoiceNumber,
          billing_period_start: periodStart.toISOString().split('T')[0],
          billing_period_end: periodEnd.toISOString().split('T')[0],
          total_warranties_sold: transactions.length,
          subtotal_amount: subtotal,
          taxes: taxes,
          total_amount: totalAmount,
          status: 'sent',
          due_date: dueDate.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (invoiceError) {
        console.error(`Error creating invoice for ${org.name}:`, invoiceError);
        results.push({
          organization: org.name,
          status: 'error',
          error: invoiceError.message,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from('warranty_transactions')
        .update({
          billing_status: 'invoiced',
          invoice_id: invoice.id,
        })
        .in('id', transactions.map((t: WarrantyTransaction) => t.id));

      if (updateError) {
        console.error(`Error updating transactions for ${org.name}:`, updateError);
      }

      const { error: emailError } = await supabase.functions.invoke('send-email', {
        body: {
          to: org.billing_email,
          subject: `Facture ${invoiceNumber} - ${org.name}`,
          html: `
            <h1>Nouvelle Facture</h1>
            <p>Bonjour,</p>
            <p>Votre facture mensuelle est maintenant disponible.</p>
            <ul>
              <li><strong>Numéro:</strong> ${invoiceNumber}</li>
              <li><strong>Période:</strong> ${periodStart.toLocaleDateString('fr-CA')} - ${periodEnd.toLocaleDateString('fr-CA')}</li>
              <li><strong>Garanties vendues:</strong> ${transactions.length}</li>
              <li><strong>Montant total:</strong> ${totalAmount.toFixed(2)} $</li>
              <li><strong>Date d'échéance:</strong> ${dueDate.toLocaleDateString('fr-CA')}</li>
            </ul>
            <p>Connectez-vous à votre espace pour consulter et payer cette facture.</p>
          `,
        },
      });

      if (emailError) {
        console.error(`Error sending email to ${org.name}:`, emailError);
      }

      results.push({
        organization: org.name,
        status: 'success',
        invoice_number: invoiceNumber,
        warranties: transactions.length,
        amount: totalAmount,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        processed: results.length,
        results,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error generating invoices:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});