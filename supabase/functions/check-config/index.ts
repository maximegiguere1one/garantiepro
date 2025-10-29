import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Edge Function: check-config
 *
 * Vérifie la disponibilité de toutes les configurations et variables d'environnement.
 * Retourne un rapport détaillé sur l'état de chaque service et fonctionnalité.
 *
 * Cette fonction aide à diagnostiquer les problèmes de configuration et à identifier
 * quelles fonctionnalités sont disponibles selon les clés configurées.
 */

interface ConfigStatus {
  name: string;
  available: boolean;
  required: boolean;
  message: string;
  features?: string[];
}

interface ConfigReport {
  timestamp: string;
  overall_status: 'healthy' | 'degraded' | 'critical';
  configs: ConfigStatus[];
  available_features: string[];
  unavailable_features: string[];
  recommendations: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[check-config] Starting configuration check...');

    const configs: ConfigStatus[] = [];
    const availableFeatures: string[] = [];
    const unavailableFeatures: string[] = [];
    const recommendations: string[] = [];

    // 1. Vérifier Supabase URL (OBLIGATOIRE)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    configs.push({
      name: 'SUPABASE_URL',
      available: !!supabaseUrl,
      required: true,
      message: supabaseUrl
        ? `Configuré: ${supabaseUrl}`
        : 'NON CONFIGURÉ - CRITIQUE',
      features: ['Base de données', 'Authentification', 'Storage', 'Edge Functions'],
    });

    if (!supabaseUrl) {
      unavailableFeatures.push('Toutes les fonctionnalités');
      recommendations.push('URGENT: Configurer SUPABASE_URL dans les variables d\'environnement');
    } else {
      availableFeatures.push('Base de données', 'Authentification de base');
    }

    // 2. Vérifier Supabase Anon Key (OBLIGATOIRE)
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    configs.push({
      name: 'SUPABASE_ANON_KEY',
      available: !!supabaseAnonKey,
      required: true,
      message: supabaseAnonKey
        ? `Configuré (${supabaseAnonKey.substring(0, 10)}...)`
        : 'NON CONFIGURÉ - CRITIQUE',
      features: ['Authentification client', 'Requêtes RLS', 'Opérations CRUD'],
    });

    if (!supabaseAnonKey) {
      unavailableFeatures.push('Authentification', 'Accès base de données');
      recommendations.push('URGENT: Configurer SUPABASE_ANON_KEY dans les variables d\'environnement');
    }

    // 3. Vérifier Service Role Key (OPTIONNEL avec notre nouvelle architecture)
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    configs.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      available: !!supabaseServiceKey,
      required: false,
      message: supabaseServiceKey
        ? `Configuré (${supabaseServiceKey.substring(0, 10)}...) - BONUS`
        : 'Non configuré - Mode dégradé gracieux activé',
      features: [
        'Opérations admin via edge functions legacy',
        'Contournement RLS pour debug',
        'Accès complet auth.users'
      ],
    });

    if (supabaseServiceKey) {
      availableFeatures.push('Fonctions admin legacy', 'Debug avancé');
      recommendations.push('INFO: Service Role Key disponible, toutes les fonctions sont actives');
    } else {
      unavailableFeatures.push('Fonctions admin legacy (invite-user, delete-user)');
      availableFeatures.push('Fonctions admin via RPC (admin-update-role, admin-promote-master)');
      recommendations.push(
        'INFO: Utiliser les nouvelles fonctions admin-* qui n\'ont pas besoin de Service Role Key'
      );
      recommendations.push(
        'Les fonctions RPC PostgreSQL remplacent les opérations Service Role avec sécurité équivalente'
      );
    }

    // 4. Vérifier Resend API Key (OBLIGATOIRE pour emails)
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    configs.push({
      name: 'RESEND_API_KEY',
      available: !!resendApiKey,
      required: true,
      message: resendApiKey
        ? `Configuré (${resendApiKey.substring(0, 7)}...)`
        : 'NON CONFIGURÉ - Emails désactivés',
      features: [
        'Envoi emails transactionnels',
        'Invitations utilisateurs',
        'Réinitialisation mots de passe',
        'Notifications par email',
        'PDF par email'
      ],
    });

    if (resendApiKey) {
      availableFeatures.push('Emails transactionnels', 'Invitations par email', 'Notifications');
    } else {
      unavailableFeatures.push('Envoi d\'emails', 'Invitations automatiques');
      recommendations.push(
        'IMPORTANT: Configurer RESEND_API_KEY pour activer l\'envoi d\'emails'
      );
      recommendations.push(
        'Sans RESEND_API_KEY, les invitations doivent être partagées manuellement'
      );
    }

    // 5. Vérifier Site URL (IMPORTANT pour redirections)
    const siteUrl = Deno.env.get('SITE_URL');
    configs.push({
      name: 'SITE_URL',
      available: !!siteUrl,
      required: true,
      message: siteUrl
        ? `Configuré: ${siteUrl}`
        : 'Non configuré - Utilise URL par défaut',
      features: [
        'Liens de redirection corrects',
        'Invitations email',
        'Réinitialisation mot de passe'
      ],
    });

    if (!siteUrl) {
      recommendations.push(
        'RECOMMANDÉ: Configurer SITE_URL pour des redirections correctes'
      );
    }

    // 6. Vérifier Stripe (OPTIONNEL)
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    configs.push({
      name: 'STRIPE_SECRET_KEY',
      available: !!stripeSecretKey,
      required: false,
      message: stripeSecretKey
        ? `Configuré (${stripeSecretKey.substring(0, 10)}...)`
        : 'Non configuré - Paiements désactivés',
      features: ['Paiements par carte', 'Abonnements', 'Remboursements'],
    });

    if (stripeSecretKey) {
      availableFeatures.push('Paiements Stripe', 'Gestion abonnements');
    } else {
      unavailableFeatures.push('Paiements en ligne');
    }

    // 7. Vérifier Twilio (OPTIONNEL)
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioSms = twilioAccountSid && twilioAuthToken;
    configs.push({
      name: 'TWILIO_SMS',
      available: !!twilioSms,
      required: false,
      message: twilioSms
        ? 'Configuré - SMS activés'
        : 'Non configuré - SMS désactivés',
      features: ['Notifications SMS', 'Vérification téléphone'],
    });

    if (twilioSms) {
      availableFeatures.push('Notifications SMS');
    } else {
      unavailableFeatures.push('Notifications SMS');
    }

    // Déterminer le statut global
    const criticalMissing = configs.filter(c => c.required && !c.available);
    const overall_status: 'healthy' | 'degraded' | 'critical' =
      criticalMissing.length > 2
        ? 'critical'
        : criticalMissing.length > 0
        ? 'degraded'
        : 'healthy';

    // Ajouter des recommandations selon le statut
    if (overall_status === 'critical') {
      recommendations.unshift(
        '🚨 CRITIQUE: Des configurations essentielles sont manquantes. L\'application pourrait ne pas fonctionner correctement.'
      );
    } else if (overall_status === 'degraded') {
      recommendations.unshift(
        '⚠️  ATTENTION: Certaines fonctionnalités sont désactivées. Configurer les clés manquantes pour une expérience complète.'
      );
    } else {
      recommendations.unshift(
        '✅ EXCELLENT: Toutes les configurations obligatoires sont en place!'
      );
    }

    const report: ConfigReport = {
      timestamp: new Date().toISOString(),
      overall_status,
      configs,
      available_features: [...new Set(availableFeatures)],
      unavailable_features: [...new Set(unavailableFeatures)],
      recommendations,
    };

    console.log('[check-config] Configuration check complete:', {
      status: overall_status,
      available: availableFeatures.length,
      unavailable: unavailableFeatures.length,
    });

    return new Response(
      JSON.stringify(report, null, 2),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('[check-config] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
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
