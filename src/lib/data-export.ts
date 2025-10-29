export function exportToCSV(data: any[], filename: string, columns: { key: string; header: string }[]) {
  if (!data || data.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  const headers = columns.map(col => col.header).join(',');

  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];

      if (value === null || value === undefined) {
        return '';
      }

      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }

      value = String(value);

      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }

      return value;
    }).join(',');
  });

  const csv = [headers, ...rows].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportWarrantiesToCSV(warranties: any[]) {
  const columns = [
    { key: 'contract_number', header: 'Numéro de contrat' },
    { key: 'status', header: 'Statut' },
    { key: 'customer_name', header: 'Client' },
    { key: 'customer_email', header: 'Courriel client' },
    { key: 'vehicle', header: 'Véhicule' },
    { key: 'vin', header: 'NIV' },
    { key: 'start_date', header: 'Début' },
    { key: 'end_date', header: 'Fin' },
    { key: 'duration_months', header: 'Durée (mois)' },
    { key: 'base_price', header: 'Prix de base' },
    { key: 'options_price', header: 'Options' },
    { key: 'taxes', header: 'Taxes' },
    { key: 'total_price', header: 'Prix total' },
    { key: 'margin', header: 'Marge' },
    { key: 'created_at', header: 'Date de création' },
  ];

  const processedData = warranties.map(w => ({
    contract_number: w.contract_number,
    status: w.status,
    customer_name: w.customers ? `${w.customers.first_name} ${w.customers.last_name}` : 'N/A',
    customer_email: w.customers?.email || 'N/A',
    vehicle: w.trailers ? `${w.trailers.year} ${w.trailers.make} ${w.trailers.model}` : 'N/A',
    vin: w.trailers?.vin || 'N/A',
    start_date: new Date(w.start_date).toLocaleDateString('fr-CA'),
    end_date: new Date(w.end_date).toLocaleDateString('fr-CA'),
    duration_months: w.duration_months,
    base_price: w.base_price.toFixed(2),
    options_price: w.options_price.toFixed(2),
    taxes: w.taxes.toFixed(2),
    total_price: w.total_price.toFixed(2),
    margin: w.margin.toFixed(2),
    created_at: new Date(w.created_at).toLocaleString('fr-CA'),
  }));

  exportToCSV(processedData, `Garanties-${new Date().toISOString().split('T')[0]}`, columns);
}

export function exportClaimsToCSV(claims: any[]) {
  const columns = [
    { key: 'claim_number', header: 'Numéro de réclamation' },
    { key: 'status', header: 'Statut' },
    { key: 'customer_name', header: 'Client' },
    { key: 'customer_email', header: 'Courriel client' },
    { key: 'warranty_number', header: 'Numéro de garantie' },
    { key: 'incident_date', header: 'Date d\'incident' },
    { key: 'incident_description', header: 'Description' },
    { key: 'current_step', header: 'Étape actuelle' },
    { key: 'approved_amount', header: 'Montant approuvé' },
    { key: 'denied_reason', header: 'Raison du refus' },
    { key: 'repair_shop_name', header: 'Garage' },
    { key: 'created_at', header: 'Date de création' },
  ];

  const processedData = claims.map(c => ({
    claim_number: c.claim_number,
    status: c.status,
    customer_name: c.customers ? `${c.customers.first_name} ${c.customers.last_name}` : 'N/A',
    customer_email: c.customers?.email || 'N/A',
    warranty_number: c.warranties?.contract_number || 'N/A',
    incident_date: new Date(c.incident_date).toLocaleDateString('fr-CA'),
    incident_description: c.incident_description,
    current_step: c.current_step,
    approved_amount: c.approved_amount ? c.approved_amount.toFixed(2) : 'N/A',
    denied_reason: c.denied_reason || 'N/A',
    repair_shop_name: c.repair_shop_name || 'N/A',
    created_at: new Date(c.created_at).toLocaleString('fr-CA'),
  }));

  exportToCSV(processedData, `Reclamations-${new Date().toISOString().split('T')[0]}`, columns);
}

export function exportCustomersToCSV(customers: any[]) {
  const columns = [
    { key: 'full_name', header: 'Nom complet' },
    { key: 'email', header: 'Courriel' },
    { key: 'phone', header: 'Téléphone' },
    { key: 'address', header: 'Adresse' },
    { key: 'city', header: 'Ville' },
    { key: 'province', header: 'Province' },
    { key: 'postal_code', header: 'Code postal' },
    { key: 'language_preference', header: 'Langue préférée' },
    { key: 'consent_marketing', header: 'Consentement marketing' },
    { key: 'created_at', header: 'Date de création' },
  ];

  const processedData = customers.map(c => ({
    full_name: `${c.first_name} ${c.last_name}`,
    email: c.email,
    phone: c.phone,
    address: c.address,
    city: c.city,
    province: c.province,
    postal_code: c.postal_code,
    language_preference: c.language_preference,
    consent_marketing: c.consent_marketing ? 'Oui' : 'Non',
    created_at: new Date(c.created_at).toLocaleString('fr-CA'),
  }));

  exportToCSV(processedData, `Clients-${new Date().toISOString().split('T')[0]}`, columns);
}

export function exportInventoryToCSV(inventory: any[]) {
  const columns = [
    { key: 'vin', header: 'NIV' },
    { key: 'vehicle', header: 'Véhicule' },
    { key: 'category', header: 'Catégorie' },
    { key: 'purchase_price', header: 'Prix d\'achat' },
    { key: 'selling_price', header: 'Prix de vente' },
    { key: 'quantity_in_stock', header: 'Quantité en stock' },
    { key: 'status', header: 'Statut' },
    { key: 'notes', header: 'Notes' },
    { key: 'created_at', header: 'Date d\'ajout' },
  ];

  const processedData = inventory.map(i => ({
    vin: i.vin,
    vehicle: `${i.year} ${i.make} ${i.model}`,
    category: i.category,
    purchase_price: i.purchase_price.toFixed(2),
    selling_price: i.selling_price.toFixed(2),
    quantity_in_stock: i.quantity_in_stock,
    status: i.status,
    notes: i.notes || 'N/A',
    created_at: new Date(i.created_at).toLocaleDateString('fr-CA'),
  }));

  exportToCSV(processedData, `Inventaire-${new Date().toISOString().split('T')[0]}`, columns);
}

export function exportWarrantyToAcombaCSV(warranty: any) {
  const columns = [
    { key: 'date', header: 'Date' },
    { key: 'invoice_number', header: 'No facture' },
    { key: 'customer_code', header: 'Code client' },
    { key: 'customer_name', header: 'Nom client' },
    { key: 'description', header: 'Description' },
    { key: 'quantity', header: 'Quantité' },
    { key: 'unit_price', header: 'Prix unitaire' },
    { key: 'subtotal', header: 'Sous-total' },
    { key: 'tps', header: 'TPS' },
    { key: 'tvq', header: 'TVQ' },
    { key: 'total', header: 'Total' },
  ];

  const tpsRate = 0.05;
  const tvqRate = 0.09975;

  const subtotal = warranty.base_price + warranty.options_price;
  const tps = subtotal * tpsRate;
  const tvq = subtotal * tvqRate;

  const invoiceData = [{
    date: new Date(warranty.created_at).toLocaleDateString('fr-CA'),
    invoice_number: warranty.contract_number,
    customer_code: warranty.customers?.email || 'CLIENT',
    customer_name: warranty.customers ? `${warranty.customers.first_name} ${warranty.customers.last_name}` : 'N/A',
    description: `Garantie prolongée - ${warranty.trailers ? `${warranty.trailers.year} ${warranty.trailers.make} ${warranty.trailers.model}` : 'Remorque'}`,
    quantity: '1',
    unit_price: subtotal.toFixed(2),
    subtotal: subtotal.toFixed(2),
    tps: tps.toFixed(2),
    tvq: tvq.toFixed(2),
    total: warranty.total_price.toFixed(2),
  }];

  exportToCSV(invoiceData, `Facture-Acomba-${warranty.contract_number}`, columns);
}
