import { Order, OrderStatus, OrderItem } from '@/constants/types';

export const MOCK_ORDERS: Order[] = [
  {
    id: 1,
    orderNumber: '#0001',
    type: 'food',
    status: 'delivered' as OrderStatus,
    createdAt: new Date('2026-01-03T14:30:00'),
    deliveredAt: new Date('2026-01-03T15:15:00'),
    customerId: 'user-1',
    customerName: 'Juan Pérez',
    customerPhone: '+1 (234) 567-8900',
    driverName: 'Carlos Ramírez',
    driverPhone: '+1 (234) 567-8901',
    driverRating: 4.8,
    businessName: 'Restaurante El Buen Sabor',
    items: [
      { id: '1', name: 'Hamburguesa Clásica', quantity: 2, price: 8.99 } as OrderItem,
      { id: '2', name: 'Papas Fritas Grandes', quantity: 1, price: 3.99 } as OrderItem,
      { id: '3', name: 'Coca Cola 500ml', quantity: 2, price: 1.99 } as OrderItem,
    ],
    subtotal: 25.95,
    deliveryFee: 2.50,
    total: 28.45,
    pickupAddress: 'Calle Principal 123, Centro',
    deliveryAddress: 'Av. Libertad 456, Apto 302',
    pickupLocation: { latitude: 18.4861, longitude: -69.9312 },
    deliveryLocation: { latitude: 18.4901, longitude: -69.9402 },
    notes: 'Sin cebolla en la hamburguesa',
    rated: false,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    pickupCode: 'ABC12',
    deliveryCode: 'XYZ78',
    pickupValidation: { validated: true, validatedAt: '2026-01-03T14:45:00Z', validatedBy: 'business-1' },
    deliveryValidation: { validated: true, validatedAt: '2026-01-03T15:15:00Z', validatedBy: 'user-1' },
  },
  {
    id: 2,
    orderNumber: '#0002',
    type: 'shopping',
    status: 'delivered' as OrderStatus,
    createdAt: new Date('2026-01-02T10:00:00'),
    deliveredAt: new Date('2026-01-02T11:30:00'),
    customerId: 'user-1',
    customerName: 'Juan Pérez',
    customerPhone: '+1 (234) 567-8900',
    driverName: 'María González',
    driverPhone: '+1 (234) 567-8902',
    driverRating: 4.9,
    businessName: 'Supermercado La Economía',
    shoppingList: 'Leche, Pan, Huevos, Queso, Mantequilla, Café',
    subtotal: 35.00,
    deliveryFee: 3.00,
    total: 38.00,
    pickupAddress: 'Calle Comercio 789',
    deliveryAddress: 'Av. Libertad 456, Apto 302',
    pickupLocation: { latitude: 18.4750, longitude: -69.9100 },
    deliveryLocation: { latitude: 18.4901, longitude: -69.9402 },
    rated: true,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    pickupCode: 'DEF34',
    deliveryCode: 'UVW56',
    pickupValidation: { validated: true, validatedAt: '2026-01-02T10:30:00Z', validatedBy: 'business-2' },
    deliveryValidation: { validated: true, validatedAt: '2026-01-02T11:30:00Z', validatedBy: 'user-1' },
  },
  {
    id: 3,
    orderNumber: '#0003',
    type: 'delivery',
    status: 'in_transit' as OrderStatus,
    createdAt: new Date('2026-01-04T09:00:00'),
    customerId: 'user-1',
    customerName: 'Juan Pérez',
    customerPhone: '+1 (234) 567-8900',
    driverName: 'Pedro Martínez',
    driverPhone: '+1 (234) 567-8903',
    driverRating: 4.7,
    packageDescription: 'Documentos importantes - Sobre manila',
    packageWeight: 0.5,
    deliveryFee: 5.00,
    total: 5.00,
    pickupAddress: 'Edificio Empresarial Torre A, Piso 5',
    deliveryAddress: 'Calle Los Próceres 890, Casa 15',
    pickupLocation: { latitude: 18.4650, longitude: -69.9250 },
    deliveryLocation: { latitude: 18.4850, longitude: -69.9500 },
    notes: 'Llamar antes de llegar',
    rated: false,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    pickupCode: 'GHI90',
    deliveryCode: 'RST12',
    pickupValidation: { validated: true, validatedAt: '2026-01-04T09:15:00Z', validatedBy: 'user-1' },
    deliveryValidation: { validated: false },
  },
  {
    id: 4,
    orderNumber: '#0004',
    type: 'food',
    status: 'cancelled' as OrderStatus,
    createdAt: new Date('2026-01-01T20:00:00'),
    customerId: 'user-1',
    customerName: 'Juan Pérez',
    customerPhone: '+1 (234) 567-8900',
    businessName: 'Pizzería Don Giovanni',
    items: [
      { id: '4', name: 'Pizza Pepperoni Grande', quantity: 1, price: 15.99 } as OrderItem,
    ],
    subtotal: 15.99,
    deliveryFee: 2.50,
    total: 18.49,
    deliveryAddress: 'Av. Libertad 456, Apto 302',
    deliveryLocation: { latitude: 18.4901, longitude: -69.9402 },
    cancelReason: 'Tiempo de espera muy largo',
    rated: false,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    pickupCode: 'JKL45',
    deliveryCode: 'MNO67',
    pickupValidation: { validated: false },
    deliveryValidation: { validated: false },
  },
  {
    id: 5,
    orderNumber: '#0005',
    type: 'food',
    status: 'preparing' as OrderStatus,
    createdAt: new Date('2026-01-04T12:00:00'),
    customerId: 'user-2',
    customerName: 'Ana Rodríguez',
    customerPhone: '+1 (234) 567-8904',
    businessName: 'Cafetería Central',
    items: [
      { id: '5', name: 'Cappuccino Grande', quantity: 2, price: 4.50 } as OrderItem,
      { id: '6', name: 'Croissant de Chocolate', quantity: 2, price: 3.25 } as OrderItem,
    ],
    subtotal: 15.50,
    deliveryFee: 2.00,
    total: 17.50,
    pickupAddress: 'Plaza Central, Local 12',
    deliveryAddress: 'Torre Ejecutiva, Oficina 801',
    pickupLocation: { latitude: 18.4720, longitude: -69.9180 },
    deliveryLocation: { latitude: 18.4790, longitude: -69.9280 },
    rated: false,
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    pickupCode: 'PQR89',
    deliveryCode: 'STU01',
    pickupValidation: { validated: false },
    deliveryValidation: { validated: false },
  },
];

export const getOrdersByUser = (userId: string): Order[] => {
  return MOCK_ORDERS.filter(order => order.customerName === 'Juan Pérez');
};

export const getOrdersByStatus = (status: OrderStatus): Order[] => {
  return MOCK_ORDERS.filter(order => order.status === status);
};

export const getOrderById = (id: number): Order | undefined => {
  return MOCK_ORDERS.find(order => order.id === id);
};

export const getActiveOrders = (): Order[] => {
  return MOCK_ORDERS.filter(order => 
    order.status === 'pending' || 
    order.status === 'confirmed' || 
    order.status === 'preparing' || 
    order.status === 'ready' || 
    order.status === 'in_transit'
  );
};

export const getCompletedOrders = (): Order[] => {
  return MOCK_ORDERS.filter(order => order.status === 'delivered');
};

export const getCancelledOrders = (): Order[] => {
  return MOCK_ORDERS.filter(order => order.status === 'cancelled');
};

export const getUnratedOrders = (): Order[] => {
  return MOCK_ORDERS.filter(order => 
    order.status === 'delivered' && !order.rated
  );
};
