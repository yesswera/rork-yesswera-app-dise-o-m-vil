import { supabase } from '@/constants/supabase';
import { SavedAddress } from '@/constants/types';

function mapAddress(dbAddress: any): SavedAddress {
  return {
    id: dbAddress.id,
    userId: dbAddress.user_id,
    label: dbAddress.label,
    address: dbAddress.street_address,
    latitude: dbAddress.location?.coordinates?.[1] || 0,
    longitude: dbAddress.location?.coordinates?.[0] || 0,
    instructions: dbAddress.reference,
    isDefault: dbAddress.is_default,
    createdAt: dbAddress.created_at,
  };
}

export async function getUserAddresses(userId: string): Promise<SavedAddress[]> {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapAddress);
  } catch (error) {
    console.error('getUserAddresses error:', error);
    throw error;
  }
}

export async function createAddress(data: {
  userId: string;
  label: string;
  streetAddress: string;
  reference?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}): Promise<SavedAddress> {
  try {
    // If this will be the default, unset other defaults first
    if (data.isDefault) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', data.userId);
    }

    const insertData: any = {
      user_id: data.userId,
      label: data.label,
      street_address: data.streetAddress,
      reference: data.reference,
      is_default: data.isDefault || false,
    };

    // Add location if coordinates provided
    if (data.latitude && data.longitude) {
      insertData.location = `POINT(${data.longitude} ${data.latitude})`;
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return mapAddress(address);
  } catch (error) {
    console.error('createAddress error:', error);
    throw error;
  }
}

export async function updateAddress(
  addressId: string,
  data: Partial<{
    label: string;
    streetAddress: string;
    reference: string;
    latitude: number;
    longitude: number;
    isDefault: boolean;
  }>
): Promise<SavedAddress> {
  try {
    const updateData: any = {};

    if (data.label !== undefined) updateData.label = data.label;
    if (data.streetAddress !== undefined) updateData.street_address = data.streetAddress;
    if (data.reference !== undefined) updateData.reference = data.reference;
    if (data.isDefault !== undefined) updateData.is_default = data.isDefault;

    if (data.latitude !== undefined && data.longitude !== undefined) {
      updateData.location = `POINT(${data.longitude} ${data.latitude})`;
    }

    const { data: address, error } = await supabase
      .from('addresses')
      .update(updateData)
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;

    return mapAddress(address);
  } catch (error) {
    console.error('updateAddress error:', error);
    throw error;
  }
}

export async function deleteAddress(addressId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteAddress error:', error);
    throw error;
  }
}

export async function setDefaultAddress(addressId: string, userId: string): Promise<void> {
  try {
    // First unset all defaults for this user
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('user_id', userId);

    // Then set the new default
    const { error } = await supabase
      .from('addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    if (error) throw error;
  } catch (error) {
    console.error('setDefaultAddress error:', error);
    throw error;
  }
}

export async function getDefaultAddress(userId: string): Promise<SavedAddress | null> {
  try {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }

    return mapAddress(data);
  } catch (error) {
    console.error('getDefaultAddress error:', error);
    throw error;
  }
}
