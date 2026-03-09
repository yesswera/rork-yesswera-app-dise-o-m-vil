import { supabase } from '@/constants/supabase';
import { processImage } from '@/services/image-upload';

// =============================================
// TYPES
// =============================================

export type DocType = 'ine_front' | 'ine_back' | 'selfie' | 'proof_of_address' | 'license_front' | 'license_back';
export type DocStatus = 'pending' | 'approved' | 'rejected';
export type VerificationStatus = 'pending' | 'documents_submitted' | 'approved' | 'rejected';

export interface DriverDocument {
  id: string;
  driverId: string;
  docType: DocType;
  imageUrl: string;
  status: DocStatus;
  rejectedReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DocumentRequirement {
  docType: DocType;
  label: string;
  description: string;
  required: boolean;
}

// =============================================
// DOCUMENT REQUIREMENTS
// =============================================

export function getDocumentRequirements(vehicleType?: string): DocumentRequirement[] {
  const base: DocumentRequirement[] = [
    { docType: 'ine_front', label: 'INE (Frente)', description: 'Foto clara de tu identificacion oficial por el frente', required: true },
    { docType: 'ine_back', label: 'INE (Reverso)', description: 'Foto clara de tu identificacion oficial por atras', required: true },
    { docType: 'selfie', label: 'Selfie con INE', description: 'Foto tuya sosteniendo tu INE al lado de tu cara', required: true },
    { docType: 'proof_of_address', label: 'Comprobante de Domicilio', description: 'Recibo de luz, agua o telefono reciente (menos de 3 meses)', required: true },
  ];

  const needsLicense = vehicleType === 'moto' || vehicleType === 'auto';
  if (needsLicense) {
    base.push(
      { docType: 'license_front', label: 'Licencia de Conducir (Frente)', description: 'Foto clara de tu licencia vigente por el frente', required: true },
      { docType: 'license_back', label: 'Licencia de Conducir (Reverso)', description: 'Foto clara de tu licencia por atras', required: true },
    );
  }

  return base;
}

// =============================================
// CRUD OPERATIONS
// =============================================

function mapDocument(row: any): DriverDocument {
  return {
    id: row.id,
    driverId: row.driver_id,
    docType: row.doc_type,
    imageUrl: row.image_url,
    status: row.status,
    rejectedReason: row.rejected_reason || undefined,
    reviewedAt: row.reviewed_at || undefined,
    createdAt: row.created_at,
  };
}

export async function getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  const { data, error } = await supabase
    .from('driver_documents')
    .select('*')
    .eq('driver_id', driverId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapDocument);
}

export async function uploadDriverDocument(
  driverId: string,
  docType: DocType,
  imageUri: string,
): Promise<DriverDocument> {
  // Process image (resize + compress)
  const processed = await processImage(imageUri);

  // Upload to Supabase Storage
  const fileName = `${driverId}/${docType}-${Date.now()}.jpg`;
  const base64Data = processed.base64;
  const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const { error: uploadError } = await supabase.storage
    .from('driver-documents')
    .upload(fileName, bytes, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  // Get signed URL (private bucket - 1 year expiry)
  const { data: urlData } = await supabase.storage
    .from('driver-documents')
    .createSignedUrl(fileName, 365 * 24 * 60 * 60);

  const imageUrl = urlData?.signedUrl || '';

  // Upsert document record
  const { data, error } = await supabase
    .from('driver_documents')
    .upsert({
      driver_id: driverId,
      doc_type: docType,
      image_url: imageUrl,
      status: 'pending',
      rejected_reason: null,
      reviewed_by: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'driver_id,doc_type' })
    .select()
    .single();

  if (error) throw error;
  return mapDocument(data);
}

export async function deleteDriverDocument(driverId: string, docType: DocType): Promise<void> {
  // Delete from storage
  const { data: files } = await supabase.storage
    .from('driver-documents')
    .list(driverId, { search: docType });

  if (files && files.length > 0) {
    await supabase.storage
      .from('driver-documents')
      .remove(files.map(f => `${driverId}/${f.name}`));
  }

  // Delete record
  await supabase
    .from('driver_documents')
    .delete()
    .eq('driver_id', driverId)
    .eq('doc_type', docType);
}

// =============================================
// VERIFICATION STATUS
// =============================================

export async function getVerificationStatus(driverId: string): Promise<{
  status: VerificationStatus;
  notes?: string;
  documents: DriverDocument[];
}> {
  const [docsResult, driverResult] = await Promise.all([
    getDriverDocuments(driverId),
    supabase.from('drivers').select('verification_status, verification_notes').eq('id', driverId).maybeSingle(),
  ]);

  return {
    status: driverResult.data?.verification_status || 'pending',
    notes: driverResult.data?.verification_notes || undefined,
    documents: docsResult,
  };
}

export async function submitForVerification(driverId: string): Promise<void> {
  const { error } = await supabase
    .from('drivers')
    .update({
      verification_status: 'documents_submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', driverId);

  if (error) throw error;
}

// =============================================
// ADMIN OPERATIONS
// =============================================

export async function getDriversPendingVerification(): Promise<any[]> {
  const { data, error } = await supabase
    .from('drivers')
    .select('id, user_id, vehicle_type, verification_status, users(full_name, email, phone)')
    .in('verification_status', ['documents_submitted', 'pending'])
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function approveDriver(driverId: string, adminId: string): Promise<void> {
  const now = new Date().toISOString();

  // Approve all pending documents
  await supabase
    .from('driver_documents')
    .update({ status: 'approved', reviewed_by: adminId, reviewed_at: now })
    .eq('driver_id', driverId)
    .eq('status', 'pending');

  // Update driver status
  await supabase
    .from('drivers')
    .update({
      verification_status: 'approved',
      is_verified: true,
      verified_at: now,
      verified_by: adminId,
      verification_notes: null,
      updated_at: now,
    })
    .eq('id', driverId);
}

export async function rejectDriver(driverId: string, adminId: string, reason: string, rejectedDocs?: DocType[]): Promise<void> {
  const now = new Date().toISOString();

  // Reject specified documents or all pending
  if (rejectedDocs && rejectedDocs.length > 0) {
    for (const docType of rejectedDocs) {
      await supabase
        .from('driver_documents')
        .update({ status: 'rejected', rejected_reason: reason, reviewed_by: adminId, reviewed_at: now })
        .eq('driver_id', driverId)
        .eq('doc_type', docType);
    }
  }

  // Update driver status
  await supabase
    .from('drivers')
    .update({
      verification_status: 'rejected',
      verification_notes: reason,
      updated_at: now,
    })
    .eq('id', driverId);
}
