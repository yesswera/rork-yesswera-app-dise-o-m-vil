import createContextHook from '@nkzw/create-context-hook';
import { useState, useMemo } from 'react';
import type { CartItem, Product, SelectedVariant } from '@/constants/types';

// Generate unique key for cart item (product + specific variants)
function makeCartKey(productId: string, variants?: SelectedVariant[]): string {
  if (!variants || variants.length === 0) return productId;
  const sortedIds = variants.map(v => v.variantId).sort().join(',');
  return `${productId}__${sortedIds}`;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, variants?: SelectedVariant[], notes?: string) => void;
  removeItem: (cartItemKey: string) => void;
  updateQuantity: (cartItemKey: string, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

export const [CartProvider, useCart] = createContextHook<CartState>(() => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (product: Product, variants?: SelectedVariant[], notes?: string) => {
    const key = makeCartKey(product.id, variants);
    const variantExtra = (variants || []).reduce((sum, v) => sum + v.priceAdjustment, 0);

    setItems((prev) => {
      const existing = prev.find((item) => (item.cartItemKey || item.id) === key);
      if (existing) {
        return prev.map((item) =>
          (item.cartItemKey || item.id) === key
            ? { ...item, quantity: item.quantity + 1, ...(notes !== undefined ? { notes } : {}) }
            : item
        );
      }
      return [...prev, {
        ...product,
        price: product.price + variantExtra,
        quantity: 1,
        selectedVariants: variants,
        cartItemKey: key,
        notes,
      }];
    });
  };

  const removeItem = (cartItemKey: string) => {
    setItems((prev) => prev.filter((item) => (item.cartItemKey || item.id) !== cartItemKey));
  };

  const updateQuantity = (cartItemKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(cartItemKey);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        (item.cartItemKey || item.id) === cartItemKey ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    total,
    itemCount,
  };
});
