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
  pickupCode: string;
  deliveryCode: string;
  pickupValidation: {
    validated: boolean;
    validatedAt?: string;
    validatedBy?: string;
  };
  deliveryValidation: {
    validated: boolean;
    validatedAt?: string;
    validatedBy?: string;
  };
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

export interface Vehicle {
  type: 'moto' | 'bicicleta' | 'auto' | 'pie';
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  photoUrl?: string;
}

export interface DriverDocuments {
  ine: {
    front: string;
    back: string;
    verified: boolean;
    verifiedAt?: string;
  };
  selfie: {
    url: string;
    verified: boolean;
  };
  curp: string;
  proofOfAddress: {
    url: string;
    verified: boolean;
  };
  driverLicense?: {
    front: string;
    back: string;
    expiryDate: string;
    verified: boolean;
  };
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  clabe: string;
  accountHolderName: string;
  verified: boolean;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface DriverStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageRating: number;
  totalRatings: number;
  onTimeDeliveryRate: number;
  acceptanceRate: number;
  completionRate: number;
  averageDeliveryTime: number;
  totalDistance: number;
  activeHours: number;
  todayOrders: number;
  weekOrders: number;
  monthOrders: number;
}

export interface EarningsPeriod {
  totalEarned: number;
  ordersCompleted: number;
  tips: number;
  bonuses: number;
}

export interface DriverEarnings {
  today: EarningsPeriod;
  week: EarningsPeriod;
  month: EarningsPeriod;
  allTime: {
    totalEarned: number;
    ordersCompleted: number;
    averagePerOrder: number;
  };
  pendingSettlement: {
    amount: number;
    ordersCount: number;
    nextSettlementDate: string;
  };
}

export interface Driver extends User {
  workPhone?: string;
  workPhoneVerified: boolean;
  workPhoneSetupDate?: string;
  vehicle: Vehicle;
  documents: DriverDocuments;
  bankAccount?: BankAccount;
  emergencyContact: EmergencyContact;
  stats: DriverStats;
  earnings: DriverEarnings;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  verificationStatus: 'pending' | 'approved' | 'rejected';
}

export interface DailySettlement {
  id: string;
  driverId: string;
  date: string;
  ordersCompleted: number;
  totalCollected: number;
  breakdown: {
    subtotals: number;
    deliveryFees: number;
    tips: number;
  };
  driverEarnings: number;
  toDeliver: number;
  status: 'pending' | 'delivered' | 'verified';
  deliveredAt?: string;
  deliveryMethod?: 'cash' | 'transfer' | 'oxxo';
  deliveryLocation?: string;
  receiptUrl?: string;
}

export interface ThreatReport {
  id: string;
  reporterId: string;
  reporterType: UserType;
  reportType: 'threat' | 'extortion' | 'harassment' | 'violence' | 'other';
  orderId?: string;
  description: string;
  threatPhone?: string;
  evidence?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
  reportedAt: string;
  status: 'pending' | 'investigating' | 'resolved';
  resolution?: string;
}

export type BusinessCategory =
  | 'restaurant'
  | 'cafe'
  | 'bakery'
  | 'grocery'
  | 'pharmacy'
  | 'convenience_store'
  | 'liquor_store'
  | 'flowers'
  | 'gifts'
  | 'other';

export interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks?: {
    start: string;
    end: string;
  }[];
}

export interface BusinessDocuments {
  rfc: {
    number: string;
    document: string;
    verified: boolean;
  };
  proofOfAddress: {
    url: string;
    verified: boolean;
  };
  ownerID: {
    front: string;
    back: string;
    verified: boolean;
  };
  healthPermit?: {
    url: string;
    expiryDate: string;
    verified: boolean;
  };
  businessLicense?: {
    url: string;
    verified: boolean;
  };
}

export interface BusinessStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageRating: number;
  totalRatings: number;
  averagePrepTime: number;
  acceptanceRate: number;
  onTimeRate: number;
  totalRevenue: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalProducts: number;
  activeProducts: number;
  topSellingProducts: {
    productId: string;
    name: string;
    timesSold: number;
  }[];
}

export interface BusinessFull extends Business {
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  deliveryRadius: number;
  minimumOrder?: number;
  schedule: {
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
    sunday: DaySchedule;
  };
  isOpen: boolean;
  temporaryClosed: boolean;
  closedReason?: string;
  documents: BusinessDocuments;
  stats: BusinessStats;
  deliveryConfig: {
    freeDeliveryOver?: number;
    deliveryFee: number;
    estimatedPrepTime: number;
  };
  bankAccount?: BankAccount;
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface ProductOption {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  choices: {
    id: string;
    name: string;
    priceModifier: number;
  }[];
}

export interface ProductFull extends Product {
  categoryId: string;
  available: boolean;
  inStock: boolean;
  options?: ProductOption[];
  preparationTime?: number;
  featured: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductCategory {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  order: number;
  active: boolean;
}

export interface BusinessSettlement {
  id: string;
  businessId: string;
  weekStart: string;
  weekEnd: string;
  ordersCount: number;
  totalSales: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'paid';
  paidAt?: string;
  paymentMethod?: 'transfer' | 'check' | 'cash';
  paymentReference?: string;
  breakdown: {
    foodSales: number;
    deliveryFees: number;
    taxes: number;
  };
}

export type SurveyQuestionType = 'rating' | 'multiple_choice' | 'yes_no' | 'text' | 'scale';

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  question: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  required: boolean;
}

export interface Survey {
  id: string;
  targetAudience: UserType | 'all';
  triggerEvent: 'order_completed' | 'app_open' | 'idle_time' | 'manual' | 'timed';
  triggerCondition?: {
    ordersMin?: number;
    timeOfDay?: { start: string; end: string };
    daysOfWeek?: number[];
    oncePerUser?: boolean;
  };
  priority: 'low' | 'medium' | 'high';
  questions: SurveyQuestion[];
  incentive?: {
    type: 'discount' | 'points' | 'free_delivery';
    value: number;
    description: string;
  };
  active: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  userId: string;
  userType: UserType;
  orderId?: string;
  responses: {
    questionId: string;
    answer: string | number;
  }[];
  context: {
    timestamp: string;
    dayOfWeek: number;
    hour: number;
    location?: { latitude: number; longitude: number };
    deviceInfo: string;
  };
  completedAt: string;
}

export interface UserBehaviorEvent {
  id: string;
  userId: string;
  userType: UserType;
  eventType: 'page_view' | 'button_click' | 'order_placed' | 'search' | 'filter_applied' | 'item_added_cart' | 'checkout_started' | 'checkout_completed' | 'app_open' | 'app_close' | 'feature_used' | 'driver_status_change' | 'order_accept_attempt' | 'order_accept_cancelled' | 'order_accepted';
  eventData: Record<string, any>;
  sessionId: string;
  timestamp: string;
  location?: { latitude: number; longitude: number };
}

export interface AnalyticsInsight {
  id: string;
  category: 'sales' | 'service_quality' | 'peak_hours' | 'user_satisfaction' | 'delivery_performance';
  title: string;
  description: string;
  data: Record<string, any>;
  recommendation?: string;
  priority: 'info' | 'warning' | 'critical';
  generatedAt: string;
  affectedUsers?: string[];
}

