import { supabase } from './supabase';

/**
 * Télécharge un document PDF depuis différentes sources
 * Supporte:
 * - Base64 (ancien format)
 * - Storage path (nouveau format)
 * - URL complète Storage
 */
export async function downloadPDF(
  source: string,
  filename: string
): Promise<void> {
  try {
    // Cas 1: Base64 (commence par "data:" ou "JVBERi0")
    if (source.startsWith('data:') || source.startsWith('JVBERi0')) {
      downloadBase64PDF(source, filename);
      return;
    }

    // Cas 2: URL complète Storage (commence par http)
    if (source.startsWith('http://') || source.startsWith('https://')) {
      await downloadFromStorageUrl(source, filename);
      return;
    }

    // Cas 3: Path relatif Storage
    await downloadFromStoragePath(source, filename);
  } catch (error: any) {
    console.error('Error downloading PDF:', error);
    throw new Error(error.message || 'Erreur lors du téléchargement');
  }
}

/**
 * Télécharge un PDF base64
 */
export function downloadBase64PDF(base64Data: string, filename: string): void {
  let base64String = base64Data;

  // Si c'est un data URL, extraire la partie base64
  if (base64String.startsWith('data:')) {
    base64String = base64String.split(',')[1];
  }

  // Décoder base64 en bytes
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Créer un blob et télécharger
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Télécharge depuis une URL complète de Storage
 */
async function downloadFromStorageUrl(url: string, filename: string): Promise<void> {
  // Extraire le path du fichier de l'URL
  const urlObj = new URL(url);
  const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^\/]+)\/(.+)/);

  if (!pathMatch) {
    // Si on ne peut pas extraire le path, essayer de télécharger directement
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to download file');
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    return;
  }

  const [, bucket, filePath] = pathMatch;
  await downloadFromStoragePath(filePath, filename, bucket);
}

/**
 * Télécharge depuis un path Storage
 */
async function downloadFromStoragePath(
  filePath: string,
  filename: string,
  bucket: string = 'warranty-documents'
): Promise<void> {
  // Générer une URL signée
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 60);

  if (error) throw error;
  if (!data?.signedUrl) throw new Error('No signed URL generated');

  // Télécharger le fichier
  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error('Failed to download file');

  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
