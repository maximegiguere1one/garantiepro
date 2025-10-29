export function exportToCSV(organizations: any[], filename: string = 'organisations.csv') {
  const headers = [
    'Nom',
    'Email',
    'Téléphone',
    'Ville',
    'Province',
    'Code Postal',
    'Statut',
    'Garanties',
    'Utilisateurs',
    'Commission (%)',
    'Date de création',
  ];

  const rows = organizations.map(org => [
    org.name,
    org.billing_email || '',
    org.billing_phone || '',
    org.city || '',
    org.province || '',
    org.postal_code || '',
    org.status,
    org.warrantyCount || 0,
    org.userCount || 0,
    org.billingConfig?.percentage_rate || 0,
    new Date(org.created_at).toLocaleDateString('fr-FR'),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportToJSON(organizations: any[], filename: string = 'organisations.json') {
  const dataStr = JSON.stringify(organizations, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function generateSummaryReport(organizations: any[]): string {
  const total = organizations.length;
  const active = organizations.filter(o => o.status === 'active').length;
  const suspended = organizations.filter(o => o.status === 'suspended').length;
  const totalWarranties = organizations.reduce((sum, o) => sum + (o.warrantyCount || 0), 0);
  const totalUsers = organizations.reduce((sum, o) => sum + (o.userCount || 0), 0);

  const avgCommission = organizations.reduce((sum, o) =>
    sum + (o.billingConfig?.percentage_rate || 0), 0) / total;

  return `
RAPPORT RÉSUMÉ DES FRANCHISÉS
=====================================

Total des franchisés: ${total}
- Actifs: ${active} (${Math.round(active/total * 100)}%)
- Suspendus: ${suspended} (${Math.round(suspended/total * 100)}%)

Statistiques globales:
- Total garanties vendues: ${totalWarranties}
- Total utilisateurs: ${totalUsers}
- Commission moyenne: ${avgCommission.toFixed(2)}%

Généré le: ${new Date().toLocaleString('fr-FR')}
  `.trim();
}
