import { API_ENDPOINTS } from '@/constants/api';
import { ProductFull, ProductCategory } from '@/constants/types';

export async function getBusinessProducts(businessId: string, token: string): Promise<ProductFull[]> {
  const response = await fetch(API_ENDPOINTS.business.products(businessId), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener productos');
  }

  return response.json();
}

export async function getBusinessCategories(businessId: string, token: string): Promise<ProductCategory[]> {
  const response = await fetch(API_ENDPOINTS.business.categories(businessId), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener categorías');
  }

  return response.json();
}

export async function createProduct(
  businessId: string,
  productData: Partial<ProductFull>,
  token: string
): Promise<ProductFull> {
  const response = await fetch(API_ENDPOINTS.business.products(businessId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    throw new Error('Error al crear producto');
  }

  return response.json();
}

export async function updateProduct(
  businessId: string,
  productId: string,
  productData: Partial<ProductFull>,
  token: string
): Promise<ProductFull> {
  const response = await fetch(API_ENDPOINTS.business.product(businessId, productId), {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(productData),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar producto');
  }

  return response.json();
}

export async function deleteProduct(
  businessId: string,
  productId: string,
  token: string
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.business.product(businessId, productId), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar producto');
  }
}

export async function toggleProductAvailability(
  businessId: string,
  productId: string,
  available: boolean,
  token: string
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.business.productAvailability(businessId, productId), {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ available }),
  });

  if (!response.ok) {
    throw new Error('Error al cambiar disponibilidad');
  }
}

export async function createCategory(
  businessId: string,
  categoryData: Partial<ProductCategory>,
  token: string
): Promise<ProductCategory> {
  const response = await fetch(API_ENDPOINTS.business.categories(businessId), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    throw new Error('Error al crear categoría');
  }

  return response.json();
}

export async function updateCategory(
  businessId: string,
  categoryId: string,
  categoryData: Partial<ProductCategory>,
  token: string
): Promise<ProductCategory> {
  const response = await fetch(API_ENDPOINTS.business.category(businessId, categoryId), {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(categoryData),
  });

  if (!response.ok) {
    throw new Error('Error al actualizar categoría');
  }

  return response.json();
}

export async function deleteCategory(
  businessId: string,
  categoryId: string,
  token: string
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.business.category(businessId, categoryId), {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar categoría');
  }
}
