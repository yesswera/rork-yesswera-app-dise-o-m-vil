import { supabase } from '@/constants/supabase';
import { ProductFull, ProductCategory } from '@/constants/types';

function mapProduct(dbProduct: any): ProductFull {
  return {
    id: dbProduct.id,
    businessId: dbProduct.business_id,
    categoryId: dbProduct.category_id,
    name: dbProduct.name,
    description: dbProduct.description,
    price: dbProduct.price,
    image: dbProduct.image_url,
    isAvailable: dbProduct.is_available,
    preparationTime: dbProduct.preparation_time_minutes,
    variants: dbProduct.product_variants || [],
  };
}

function mapCategory(dbCategory: any): ProductCategory {
  return {
    id: dbCategory.id,
    businessId: dbCategory.business_id,
    name: dbCategory.name,
    description: dbCategory.description,
    sortOrder: dbCategory.sort_order,
    isActive: dbCategory.is_active,
  };
}

export async function getBusinessProducts(businessId: string): Promise<ProductFull[]> {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_variants (*)
      `)
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('name');

    if (error) throw error;

    return (data || []).map(mapProduct);
  } catch (error) {
    console.error('getBusinessProducts error:', error);
    throw error;
  }
}

export async function getBusinessCategories(businessId: string): Promise<ProductCategory[]> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data || []).map(mapCategory);
  } catch (error) {
    console.error('getBusinessCategories error:', error);
    throw error;
  }
}

export async function createProduct(
  businessId: string,
  productData: Partial<ProductFull>
): Promise<ProductFull> {
  try {
    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: businessId,
        category_id: productData.categoryId,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        image_url: productData.image,
        is_available: productData.isAvailable ?? true,
        preparation_time_minutes: productData.preparationTime,
      })
      .select()
      .single();

    if (error) throw error;

    return mapProduct(data);
  } catch (error) {
    console.error('createProduct error:', error);
    throw error;
  }
}

export async function updateProduct(
  businessId: string,
  productId: string,
  productData: Partial<ProductFull>
): Promise<ProductFull> {
  try {
    const updateData: any = {};

    if (productData.name !== undefined) updateData.name = productData.name;
    if (productData.description !== undefined) updateData.description = productData.description;
    if (productData.price !== undefined) updateData.price = productData.price;
    if (productData.image !== undefined) updateData.image_url = productData.image;
    if (productData.isAvailable !== undefined) updateData.is_available = productData.isAvailable;
    if (productData.categoryId !== undefined) updateData.category_id = productData.categoryId;
    if (productData.preparationTime !== undefined) updateData.preparation_time_minutes = productData.preparationTime;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    return mapProduct(data);
  } catch (error) {
    console.error('updateProduct error:', error);
    throw error;
  }
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('business_id', businessId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteProduct error:', error);
    throw error;
  }
}

export async function toggleProductAvailability(
  businessId: string,
  productId: string,
  available: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_available: available })
      .eq('id', productId)
      .eq('business_id', businessId);

    if (error) throw error;
  } catch (error) {
    console.error('toggleProductAvailability error:', error);
    throw error;
  }
}

export async function createCategory(
  businessId: string,
  categoryData: Partial<ProductCategory>
): Promise<ProductCategory> {
  try {
    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        business_id: businessId,
        name: categoryData.name,
        description: categoryData.description,
        sort_order: categoryData.sortOrder || 0,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return mapCategory(data);
  } catch (error) {
    console.error('createCategory error:', error);
    throw error;
  }
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  categoryData: Partial<ProductCategory>
): Promise<ProductCategory> {
  try {
    const updateData: any = {};

    if (categoryData.name !== undefined) updateData.name = categoryData.name;
    if (categoryData.description !== undefined) updateData.description = categoryData.description;
    if (categoryData.sortOrder !== undefined) updateData.sort_order = categoryData.sortOrder;
    if (categoryData.isActive !== undefined) updateData.is_active = categoryData.isActive;

    const { data, error } = await supabase
      .from('product_categories')
      .update(updateData)
      .eq('id', categoryId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) throw error;

    return mapCategory(data);
  } catch (error) {
    console.error('updateCategory error:', error);
    throw error;
  }
}

export async function deleteCategory(businessId: string, categoryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('product_categories')
      .delete()
      .eq('id', categoryId)
      .eq('business_id', businessId);

    if (error) throw error;
  } catch (error) {
    console.error('deleteCategory error:', error);
    throw error;
  }
}
