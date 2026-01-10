export type UserType = 'cliente' | 'repartidor' | 'negocio';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  userType: UserType;
  rating?: number;
  avatar?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  businessId: string;
  businessName: string;
  category: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Business {
  id: string;
  name: string;
  description: string;
  category: string;
  image: string;
  rating: number;
  deliveryTime: string;
  tags: string[];
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  type: 'food' | 'shopping' | 'delivery';
  status: OrderStatus;
  createdAt: Date;
  deliveredAt?: Date;
  customerId: string;
  customerName: string;
  customerPhone: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverRating?: number;
  businessId?: string;
  businessName?: string;
  items?: OrderItem[];
  shoppingList?: string;
  packageDescription?: string;
  packageWeight?: number;
  subtotal?: number;
  deliveryFee: number;
  total: number;
  pickupAddress?: string;
  deliveryAddress: string;
  pickupLocation?: { latitude: number; longitude: number };
  deliveryLocation: { latitude: number; longitude: number };
  notes?: string;
  cancelReason?: string;
  rated: boolean;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
}

export interface PackageDetails {
  description: string;
  weight: string;
  size: string;
  urgency: 'standard' | 'express';
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Rating {
  id: string;
  orderId: string;
  clientId: string;
  driverId: string;
  driverName?: string;
  driverAvatar?: string;
  stars: number;
  comment?: string;
  createdAt: string;
}

export interface Store {
  id: string;
  name: string;
  category: string;
  image: string;
  distance: string;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: 'Casa' | 'Trabajo' | 'Otro';
  address: string;
  latitude: number;
  longitude: number;
  instructions?: string;
  isDefault: boolean;
  createdAt: string;
}

export type ConversationType = 'client_driver' | 'client_business';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: UserType;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  orderId: string;
  type: ConversationType;
  participants: {
    clientId: string;
    clientName: string;
    otherPartyId: string;
    otherPartyName: string;
  };
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
}

