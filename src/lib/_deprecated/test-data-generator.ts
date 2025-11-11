import { supabase } from './supabase';
import { generateAndStoreDocuments } from './document-utils';

interface TestWarrantyOptions {
  includeSignature?: boolean;
  includeOptions?: boolean;
  province?: string;
}

export async function generateTestWarranty(options: TestWarrantyOptions = {}) {
  const {
    includeSignature = true,
    includeOptions = true,
    province = 'QC'
  } = options;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.organization_id) {
      throw new Error('Organisation non trouvée');
    }

    const organizationId = profile.organization_id;

    console.log('Création du client test...');
    const testCustomer = {
      organization_id: organizationId,
      first_name: 'Maxime',
      last_name: 'Giguere',
      email: `test.${Date.now()}@example.com`,
      phone: '4185728464',
      address: '1202 Rue Beauséjour',
      city: 'Québec',
      province: province,
      postal_code: 'G3G 2K6',
      language_preference: 'fr',
    };

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(testCustomer)
      .select()
      .single();

    if (customerError) throw customerError;
    console.log('Client créé:', customer.id);

    console.log('Création de la remorque test...');
    const testTrailer = {
      organization_id: organizationId,
      customer_id: customer.id,
      year: 2025,
      make: 'Test Marque',
      model: 'Modèle Test',
      vin: `TEST${Date.now()}`,
      trailer_type: 'Utilitaire',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_price: 10000,
    };

    const { data: trailer, error: trailerError } = await supabase
      .from('trailers')
      .insert(testTrailer)
      .select()
      .single();

    if (trailerError) throw trailerError;
    console.log('Remorque créée:', trailer.id);

    console.log('Récupération du plan de garantie...');
    const { data: plans } = await supabase
      .from('warranty_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1);

    let plan = plans?.[0];

    if (!plan) {
      console.log('Création d\'un plan de garantie test...');
      const { data: newPlan, error: planError } = await supabase
        .from('warranty_plans')
        .insert({
          organization_id: organizationId,
          name: 'Plan Test',
          name_fr: 'Plan Test',
          duration_months: 72,
          base_price: 6000,
          is_active: true,
          coverage_details: 'Test',
        })
        .select()
        .single();

      if (planError) throw planError;
      plan = newPlan;
    }

    console.log('Plan de garantie:', plan.id);

    let selectedOptions: any[] = [];
    let optionsPrice = 0;

    if (includeOptions) {
      const { data: options } = await supabase
        .from('warranty_options')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(2);

      if (options && options.length > 0) {
        selectedOptions = options.map(opt => ({
          id: opt.id,
          name: opt.name,
          name_fr: opt.name_fr,
          price: opt.price,
        }));
        optionsPrice = options.reduce((sum, opt) => sum + opt.price, 0);
      }
    }

    console.log('Calcul des prix...');
    const basePrice = plan.base_price;
    const subtotal = basePrice + optionsPrice;
    const tps = subtotal * 0.05;
    const tvq = subtotal * 0.09975;
    const taxes = tps + tvq;
    const totalPrice = subtotal + taxes;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    console.log('Création de la garantie...');
    const margin = totalPrice * 0.15;
    const testWarranty = {
      organization_id: organizationId,
      customer_id: customer.id,
      trailer_id: trailer.id,
      plan_id: plan.id,
      contract_number: `TEST-${Date.now()}`,
      language: 'fr',
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      duration_months: plan.duration_months,
      base_price: basePrice,
      options_price: optionsPrice,
      selected_options: selectedOptions,
      taxes: taxes,
      total_price: totalPrice,
      margin: margin,
      deductible: 500,
      province: province,
      payment_status: 'paid',
      status: 'active',
      created_by: user.id,
    };

    const { data: warranty, error: warrantyError } = await supabase
      .from('warranties')
      .insert(testWarranty)
      .select()
      .single();

    if (warrantyError) throw warrantyError;
    console.log('Garantie créée:', warranty.id);

    let signatureDataUrl: string | undefined;

    if (includeSignature) {
      console.log('Génération de la signature test...');
      signatureDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    }

    console.log('Génération des documents PDF...');
    const documentsResult = await generateAndStoreDocuments(
      warranty.id,
      {
        warranty,
        customer,
        trailer,
        plan,
      },
      signatureDataUrl
    );

    if (!documentsResult.success) {
      throw new Error(documentsResult.error || 'Erreur lors de la génération des documents');
    }

    console.log('Documents générés avec succès!');

    const { data: tokenData } = await supabase
      .from('warranty_claim_tokens')
      .select('token')
      .eq('warranty_id', warranty.id)
      .single();

    console.log('Vente test créée avec succès!');

    return {
      success: true,
      data: {
        warranty,
        customer,
        trailer,
        plan,
        token: tokenData?.token,
        documents: {
          customerInvoice: documentsResult.customerInvoiceUrl,
          merchantInvoice: documentsResult.merchantInvoiceUrl,
          contract: documentsResult.contractUrl,
        },
      },
      message: 'Vente test générée avec succès!',
    };
  } catch (error) {
    console.error('Erreur lors de la génération de la vente test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function deleteTestWarranty(warrantyId: string) {
  try {
    const { data: warranty } = await supabase
      .from('warranties')
      .select('customer_id, trailer_id')
      .eq('id', warrantyId)
      .single();

    if (!warranty) {
      throw new Error('Garantie non trouvée');
    }

    await supabase.from('warranty_claim_tokens').delete().eq('warranty_id', warrantyId);
    await supabase.from('warranties').delete().eq('id', warrantyId);
    await supabase.from('trailers').delete().eq('id', warranty.trailer_id);
    await supabase.from('customers').delete().eq('id', warranty.customer_id);

    return {
      success: true,
      message: 'Vente test supprimée avec succès',
    };
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}

export async function listTestWarranties() {
  try {
    const { data, error } = await supabase
      .from('warranties')
      .select(`
        *,
        customer:customers(*),
        trailer:trailers(*),
        plan:warranty_plans(*),
        warranty_claim_tokens(*)
      `)
      .like('contract_number', 'TEST-%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
}
