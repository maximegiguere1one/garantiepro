import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotifyFranchiseDeletionRequest {
  historyId: string;
  deletedFranchiseName: string;
  destinationFranchiseName: string;
  warrantiesTransferred: number;
  customersTransferred: number;
  usersDeactivated: number;
  deletedByEmail?: string;
  masterUserEmail: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const {
      historyId,
      deletedFranchiseName,
      destinationFranchiseName,
      warrantiesTransferred,
      customersTransferred,
      usersDeactivated,
      masterUserEmail,
    }: NotifyFranchiseDeletionRequest = await req.json();

    console.log('[notify-franchise-deletion] Processing notification for history:', historyId);

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const fromEmail = 'notifications@garantieproremorque.com';

    // Email to master user with full details
    const masterEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Franchise Supprimée</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
            }
            .container {
              max-width: 600px;
              margin: 40px auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              color: white;
              font-size: 24px;
              font-weight: bold;
            }
            .content {
              padding: 40px 30px;
            }
            .alert {
              background: #fef2f2;
              border-left: 4px solid #dc2626;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .alert h3 {
              margin: 0 0 8px 0;
              color: #991b1b;
              font-size: 16px;
            }
            .stats {
              background: #f8fafc;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
            }
            .stat-row {
              display: flex;
              justify-content: space-between;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .stat-row:last-child {
              border-bottom: none;
            }
            .stat-label {
              color: #64748b;
              font-size: 14px;
            }
            .stat-value {
              font-weight: bold;
              color: #0f172a;
              font-size: 16px;
            }
            .info-box {
              background: #eff6ff;
              border-left: 4px solid #3b82f6;
              padding: 16px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background: #f8fafc;
              padding: 20px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
              border-top: 1px solid #e2e8f0;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: #dc2626;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🗑️ Franchise Supprimée</h1>
            </div>
            <div class="content">
              <div class="alert">
                <h3>Franchise supprimée avec succès</h3>
                <p>La franchise <strong>${deletedFranchiseName}</strong> a été supprimée et toutes ses données ont été transférées vers <strong>${destinationFranchiseName}</strong>.</p>
              </div>

              <h3 style="margin-top: 30px;">Résumé du transfert</h3>
              <div class="stats">
                <div class="stat-row">
                  <span class="stat-label">Garanties transférées</span>
                  <span class="stat-value">${warrantiesTransferred}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Clients transférés</span>
                  <span class="stat-value">${customersTransferred}</span>
                </div>
                <div class="stat-row">
                  <span class="stat-label">Utilisateurs désactivés</span>
                  <span class="stat-value">${usersDeactivated}</span>
                </div>
              </div>

              <div class="info-box">
                <strong>Historique de suppression:</strong> ${historyId}<br>
                <strong>Restauration possible jusqu'au:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-CA')}<br>
                <small>Les données sont archivées pendant 30 jours et peuvent être restaurées si nécessaire.</small>
              </div>

              <p style="margin-top: 30px; color: #475569;">
                Cette opération a été enregistrée dans le journal d'audit. Les utilisateurs désactivés ont été notifiés par email.
              </p>
            </div>
            <div class="footer">
              <p>Garantie Pro Remorque - Système de Gestion Multi-Franchises</p>
              <p>Ceci est un email automatique, merci de ne pas répondre.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email to master user
    const masterEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: masterUserEmail,
        subject: `Franchise Supprimée: ${deletedFranchiseName}`,
        html: masterEmailHtml,
      }),
    });

    if (!masterEmailResponse.ok) {
      const error = await masterEmailResponse.text();
      console.error('[notify-franchise-deletion] Failed to send master email:', error);
      throw new Error(`Failed to send master notification: ${error}`);
    }

    console.log('[notify-franchise-deletion] Master notification sent successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications sent successfully',
        historyId,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[notify-franchise-deletion] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send notifications',
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
