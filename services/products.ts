import { supabase } from '@/constants/supabase';
import { Business, Product, ProductFull, ProductCategory } from '@/constants/types';

function mapBusiness(db: any): Business {
  const prepTime = db.preparation_time_minutes || 20;
  return {
    id: db.id,
    name: db.business_name,
    description: db.description || '',
    category: db.category || 'food',
    image: db.cover_url || db.logo_url || '',
    rating: Number(db.rating_average) || 0,
    deliveryTime: `${prepTime + 10}-${prepTime + 25} min`,
    tags: [db.category || 'Restaurante'].filter(Boolean),
  };
}

function mapProductToSimple(dbProduct: any, businessName: string): Product {
  return {
    id: dbProduct.id,
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: Number(dbProduct.price),
    image: dbProduct.image_url || '',
    businessId: dbProduct.business_id,
    businessName,
    category: '',
  };
}

// Fetch businesses by category (food, shopping, etc.)
export async function getBusinesses(category?: string): Promise<Business[]> {
  try {
    let query = supabase
      .from('businesses')
      .select('*')
      .order('rating_average', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(mapBusiness);
  } catch (error) {
    console.error('getBusinesses error:', error);
    throw error;
  }
}

// Fetch single business by ID
export async function getBusinessById(businessId: string): Promise<Business | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (error) throw error;
    return data ? mapBusiness(data) : null;
  } catch (error) {
    console.error('getBusinessById error:', error);
    return null;
  }
}

// Fetch products for a business as simple Product type (for cart compatibility)
export async function getBusinessMenu(businessId: string): Promise<Product[]> {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('business_name')
      .eq('id', businessId)
      .single();

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_available', true)
      .order('name');

    if (error) throw error;

    return (data || []).map((p: any) => mapProductToSimple(p, business?.business_name || ''));
  } catch (error) {
    console.error('getBusinessMenu error:', error);
    throw error;
  }
}

function mapProduct(dbProduct: any): ProductFull {
  return {
    id: dbProduct.id,
    businessId: dbProduct.business_id,
    businessName: '',
    categoryId: dbProduct.category_id,
    category: '',
    name: dbProduct.name,
    description: dbProduct.description || '',
    price: dbProduct.price,
    image: dbProduct.image_url || '',
    available: dbProduct.is_available,
    inStock: dbProduct.is_available,
    preparationTime: dbProduct.preparation_time_minutes,
    featured: false,
    createdAt: dbProduct.created_at || new Date().toISOString(),
    updatedAt: dbProduct.updated_at || new Date().toISOString(),
  };
}

function mapCategory(dbCategory: any): ProductCategory {
  return {
    id: dbCategory.id,
    businessId: dbCategory.business_id,
    name: dbCategory.name,
    description: dbCategory.description,
    order: dbCategory.sort_order || 0,
    active: dbCategory.is_active,
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
        is_available: productData.available ?? true,
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
    if (productData.available !== undefined) updateData.is_available = productData.available;
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
        sort_order: categoryData.order || 0,
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
    if (categoryData.order !== undefined) updateData.sort_order = categoryData.order;
    if (categoryData.active !== undefined) updateData.is_active = categoryData.active;

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
