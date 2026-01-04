export type UserType = 'cliente' | 'repartidor' | 'negocio';

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

export interface Order {
  id: string;
  clientId: string;
  driverId?: string;
  businessId?: string;
  items?: CartItem[];
  shoppingList?: string;
  packageDetails?: PackageDetails;
  origin?: Location;
  destination: Location;
  orderType: 'food' | 'shopping' | 'delivery';
  status: 'pending' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';
  total: number;
  deliveryCost: number;
  distance: number;
  createdAt: string;
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
  stars: number;
  comment?: string;
  createdAt: string;
}
