import * as XLSX from 'xlsx';
import { supabase } from './supabase';

export interface TrailerBrand {
  id: string;
  organization_id: string;
  name: string;
  logo_url?: string;
  website?: string;
  country: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryImportRow {
  vin: string;
  make: string;
  model: string;
  year: number;
  trailer_type: string;
  category: 'fermee' | 'ouverte' | 'utilitaire';
  purchase_price: number;
  selling_price: number;
  quantity_in_stock: number;
  status: 'available' | 'sold' | 'reserved';
  notes?: string;
}

export interface ImportResult {
  success: boolean;
  row: number;
  data?: InventoryImportRow;
  errors: string[];
}

export interface ImportSummary {
  total: number;
  successful: number;
  failed: number;
  results: ImportResult[];
}

export async function fetchBrands(organizationId: string): Promise<TrailerBrand[]> {
  const { data, error } = await supabase
    .from('trailer_brands')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function createBrand(
  organizationId: string,
  name: string,
  userId: string,
  additionalData?: Partial<TrailerBrand>
): Promise<TrailerBrand> {
  const { data, error } = await supabase
    .from('trailer_brands')
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      created_by: userId,
      ...additionalData,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function findOrCreateBrand(
  organizationId: string,
  brandName: string,
  userId: string
): Promise<TrailerBrand> {
  const brands = await fetchBrands(organizationId);
  const existing = brands.find(
    (b) => b.name.toLowerCase() === brandName.toLowerCase()
  );

  if (existing) return existing;

  return createBrand(organizationId, brandName, userId);
}

export function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsBinaryString(file);
  });
}

export function parseCSVFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const workbook = XLSX.read(text, { type: 'string' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'));
    };

    reader.readAsText(file);
  });
}

export function validateInventoryRow(row: any, rowIndex: number): ImportResult {
  const errors: string[] = [];

  if (!row.vin || String(row.vin).trim() === '') {
    errors.push('Le NIV est requis');
  }

  if (!row.make || String(row.make).trim() === '') {
    errors.push('La marque est requise');
  }

  if (!row.model || String(row.model).trim() === '') {
    errors.push('Le modèle est requis');
  }

  const year = parseInt(String(row.year));
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
    errors.push(`Année invalide: ${row.year}`);
  }

  if (!row.trailer_type || String(row.trailer_type).trim() === '') {
    errors.push('Le type de remorque est requis');
  }

  const validCategories = ['fermee', 'ouverte', 'utilitaire'];
  const category = String(row.category).toLowerCase();
  if (!validCategories.includes(category)) {
    errors.push(`Catégorie invalide: ${row.category}. Doit être fermee, ouverte ou utilitaire`);
  }

  const purchasePrice = parseFloat(String(row.purchase_price || 0));
  if (isNaN(purchasePrice) || purchasePrice < 0) {
    errors.push(`Prix d'achat invalide: ${row.purchase_price}`);
  }

  const sellingPrice = parseFloat(String(row.selling_price || 0));
  if (isNaN(sellingPrice) || sellingPrice < 0) {
    errors.push(`Prix de vente invalide: ${row.selling_price}`);
  }

  const quantity = parseInt(String(row.quantity_in_stock || 1));
  if (isNaN(quantity) || quantity < 0) {
    errors.push(`Quantité invalide: ${row.quantity_in_stock}`);
  }

  const validStatuses = ['available', 'sold', 'reserved'];
  const status = String(row.status || 'available').toLowerCase();
  if (!validStatuses.includes(status)) {
    errors.push(`Statut invalide: ${row.status}. Doit être available, sold ou reserved`);
  }

  if (errors.length > 0) {
    return {
      success: false,
      row: rowIndex,
      errors,
    };
  }

  return {
    success: true,
    row: rowIndex,
    data: {
      vin: String(row.vin).trim(),
      make: String(row.make).trim(),
      model: String(row.model).trim(),
      year,
      trailer_type: String(row.trailer_type).trim(),
      category: category as 'fermee' | 'ouverte' | 'utilitaire',
      purchase_price: purchasePrice,
      selling_price: sellingPrice,
      quantity_in_stock: quantity,
      status: status as 'available' | 'sold' | 'reserved',
      notes: row.notes ? String(row.notes).trim() : undefined,
    },
    errors: [],
  };
}

export async function importInventoryItems(
  items: InventoryImportRow[],
  dealerId: string
): Promise<ImportSummary> {
  const results: ImportResult[] = [];
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const { error } = await supabase.from('dealer_inventory').insert({
        dealer_id: dealerId,
        vin: item.vin,
        make: item.make,
        model: item.model,
        year: item.year,
        trailer_type: item.trailer_type,
        category: item.category,
        purchase_price: item.purchase_price,
        selling_price: item.selling_price,
        quantity_in_stock: item.quantity_in_stock,
        status: item.status,
        notes: item.notes || null,
      });

      if (error) {
        if (error.code === '23505') {
          results.push({
            success: false,
            row: i + 1,
            data: item,
            errors: ['Ce NIV existe déjà dans votre inventaire'],
          });
          failed++;
        } else {
          results.push({
            success: false,
            row: i + 1,
            data: item,
            errors: [error.message],
          });
          failed++;
        }
      } else {
        results.push({
          success: true,
          row: i + 1,
          data: item,
          errors: [],
        });
        successful++;
      }
    } catch (error: any) {
      results.push({
        success: false,
        row: i + 1,
        data: item,
        errors: [error.message || 'Erreur inconnue'],
      });
      failed++;
    }
  }

  return {
    total: items.length,
    successful,
    failed,
    results,
  };
}

export function generateExcelTemplate(): void {
  const template = [
    {
      vin: '1HGBH41JXMN109186',
      make: 'Remorques Laroche',
      model: 'Cargo Pro 6x12',
      year: 2024,
      trailer_type: 'Cargo',
      category: 'fermee',
      purchase_price: 5000,
      selling_price: 7500,
      quantity_in_stock: 1,
      status: 'available',
      notes: 'Exemple de remorque',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(template);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaire');

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
  ];

  XLSX.writeFile(workbook, 'template_inventaire_remorques.xlsx');
}

export function exportInventoryToExcel(inventory: any[], filename = 'inventaire_remorques.xlsx'): void {
  const exportData = inventory.map((item) => ({
    NIV: item.vin,
    Marque: item.make,
    Modèle: item.model,
    Année: item.year,
    Type: item.trailer_type,
    Catégorie: item.category,
    'Prix d\'achat': item.purchase_price,
    'Prix de vente': item.selling_price,
    'Quantité en stock': item.quantity_in_stock,
    Statut: item.status,
    Notes: item.notes || '',
    'Date d\'ajout': new Date(item.created_at).toLocaleDateString('fr-CA'),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaire');

  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 12 },
    { wch: 30 },
    { wch: 15 },
  ];

  XLSX.writeFile(workbook, filename);
}
