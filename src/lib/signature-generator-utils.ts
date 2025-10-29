import { supabase } from './supabase';

export interface SignatureStyle {
  id: string;
  style_name: string;
  display_name: string;
  font_family: string;
  description: string;
  preview_url: string | null;
  css_properties: {
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    letterSpacing?: string;
    textDecoration?: string;
    transform?: string;
  };
  is_active: boolean;
  display_order: number;
}

export interface EmployeeSignature {
  id: string;
  user_id: string;
  organization_id: string;
  full_name: string;
  signature_type: 'generated' | 'drawn';
  signature_data: string;
  style_name: string | null;
  is_active: boolean;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export async function getSignatureStyles(): Promise<SignatureStyle[]> {
  const { data, error } = await supabase
    .from('signature_styles')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching signature styles:', error);
    throw error;
  }

  return data || [];
}

export async function getUserSignatures(userId: string): Promise<EmployeeSignature[]> {
  const { data, error } = await supabase
    .from('employee_signatures')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user signatures:', error);
    throw error;
  }

  return data || [];
}

export async function getActiveSignature(userId: string): Promise<EmployeeSignature | null> {
  const { data, error } = await supabase
    .from('employee_signatures')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active signature:', error);
    throw error;
  }

  return data;
}

export function generateTextSignature(
  text: string,
  style: SignatureStyle,
  options: {
    width?: number;
    height?: number;
    color?: string;
    backgroundColor?: string;
  } = {}
): string {
  const {
    width = 400,
    height = 120,
    color = '#000000',
    backgroundColor = 'transparent',
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  if (backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const fontSize = parseInt(style.css_properties.fontSize || '32px');
  const fontWeight = style.css_properties.fontWeight || 'normal';
  const fontStyle = style.css_properties.fontStyle || 'normal';

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${style.font_family}`;

  const letterSpacing = parseFloat(style.css_properties.letterSpacing || '0');

  if (letterSpacing > 0) {
    const chars = text.split('');
    const totalWidth = chars.reduce((sum, char) => {
      return sum + ctx.measureText(char).width + letterSpacing;
    }, -letterSpacing);

    let xPos = (width - totalWidth) / 2;
    chars.forEach(char => {
      ctx.fillText(char, xPos, height / 2);
      xPos += ctx.measureText(char).width + letterSpacing;
    });
  } else {
    ctx.fillText(text, width / 2, height / 2);
  }

  return canvas.toDataURL('image/png');
}

export async function saveSignature(
  signature: Omit<EmployeeSignature, 'id' | 'created_at' | 'updated_at' | 'approved_by' | 'approved_at' | 'is_approved'>
): Promise<EmployeeSignature> {
  const { data, error } = await supabase
    .from('employee_signatures')
    .insert({
      user_id: signature.user_id,
      organization_id: signature.organization_id,
      full_name: signature.full_name,
      signature_type: signature.signature_type,
      signature_data: signature.signature_data,
      style_name: signature.style_name,
      is_active: signature.is_active,
      metadata: signature.metadata,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving signature:', error);
    throw error;
  }

  return data;
}

export async function updateSignature(
  signatureId: string,
  updates: Partial<Omit<EmployeeSignature, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'organization_id'>>
): Promise<EmployeeSignature> {
  const { data, error } = await supabase
    .from('employee_signatures')
    .update(updates)
    .eq('id', signatureId)
    .select()
    .single();

  if (error) {
    console.error('Error updating signature:', error);
    throw error;
  }

  return data;
}

export async function deleteSignature(signatureId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_signatures')
    .delete()
    .eq('id', signatureId);

  if (error) {
    console.error('Error deleting signature:', error);
    throw error;
  }
}

export async function setActiveSignature(signatureId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_signatures')
    .update({ is_active: true })
    .eq('id', signatureId);

  if (error) {
    console.error('Error setting active signature:', error);
    throw error;
  }
}

export async function approveSignature(
  signatureId: string,
  approvedBy: string
): Promise<EmployeeSignature> {
  const { data, error } = await supabase
    .from('employee_signatures')
    .update({
      is_approved: true,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', signatureId)
    .select()
    .single();

  if (error) {
    console.error('Error approving signature:', error);
    throw error;
  }

  return data;
}

export function downloadSignature(signatureData: string, fileName: string = 'signature.png'): void {
  const link = document.createElement('a');
  link.href = signatureData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function validateSignatureName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Le nom ne peut pas être vide' };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: 'Le nom doit contenir au moins 2 caractères' };
  }

  if (name.trim().length > 100) {
    return { valid: false, error: 'Le nom ne peut pas dépasser 100 caractères' };
  }

  const validNameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!validNameRegex.test(name.trim())) {
    return { valid: false, error: 'Le nom contient des caractères non autorisés' };
  }

  return { valid: true };
}

export function getSignaturePreview(
  text: string,
  style: SignatureStyle,
  options: { scale?: number; color?: string } = {}
): string {
  const { scale = 0.5, color = '#000000' } = options;

  const width = 400 * scale;
  const height = 120 * scale;

  return generateTextSignature(text, style, {
    width,
    height,
    color,
    backgroundColor: 'transparent',
  });
}

export async function getEmployeeSignatureForPDF(userId: string): Promise<{
  full_name: string;
  signature_data: string;
} | null> {
  try {
    const signature = await getActiveSignature(userId);

    if (!signature) {
      console.log('[signature-utils] No active signature found for user:', userId);
      return null;
    }

    return {
      full_name: signature.full_name,
      signature_data: signature.signature_data,
    };
  } catch (error) {
    console.error('[signature-utils] Error fetching employee signature:', error);
    return null;
  }
}
