// ============================================================================
// YESSWERA: SERVICIO DE UPLOAD DE IMAGENES DE PRODUCTO
// Procesa (resize/crop a cuadrado) y sube a Supabase Storage
// ============================================================================

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/constants/supabase';

// ============================================================================
// PROCESAR IMAGEN (Resize a 512x512 JPEG 85%)
// ============================================================================

export async function processImage(uri: string): Promise<{ uri: string; base64: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return {
    uri: result.uri,
    base64: result.base64 || '',
  };
}

// ============================================================================
// SUBIR IMAGEN A SUPABASE STORAGE
// Recibe base64 directamente (ya viene de processImage)
// ============================================================================

export async function uploadProductImage(
  base64Data: string,
  businessId: string
): Promise<string> {
  // Nombre unico: businessId/timestamp.jpg
  const timestamp = Date.now();
  const filePath = `${businessId}/${timestamp}.jpg`;

  // Convertir base64 a Uint8Array para upload
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // Obtener URL publica
  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// ============================================================================
// PROCESAR IMAGEN CON DIMENSIONES PERSONALIZADAS
// ============================================================================

export async function processImageCustom(
  uri: string,
  width: number,
  height: number
): Promise<{ uri: string; base64: string }> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width, height } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  return {
    uri: result.uri,
    base64: result.base64 || '',
  };
}

// ============================================================================
// SUBIR IMAGEN DE NEGOCIO (logo o cover)
// Reutiliza bucket product-images con path businesses/{businessId}/{type}-{timestamp}.jpg
// ============================================================================

export async function uploadBusinessImage(
  base64Data: string,
  businessId: string,
  type: 'logo' | 'cover'
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `businesses/${businessId}/${type}-${timestamp}.jpg`;

  // Convertir base64 a Uint8Array para upload
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { error } = await supabase.storage
    .from('product-images')
    .upload(filePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;

  // Obtener URL publica
  const { data: urlData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

// ============================================================================
// ELIMINAR IMAGEN DE SUPABASE STORAGE
// ============================================================================

export async function deleteProductImage(publicUrl: string): Promise<void> {
  // Extraer path del URL publico
  // URL formato: https://xxx.supabase.co/storage/v1/object/public/product-images/businessId/timestamp.jpg
  const match = publicUrl.match(/product-images\/(.+)$/);
  if (!match) return;

  const storagePath = match[1];
  const { error } = await supabase.storage
    .from('product-images')
    .remove([storagePath]);

  if (error) {
    console.error('Error deleting product image:', error);
  }
}
