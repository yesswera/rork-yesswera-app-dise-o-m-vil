import { Product } from '@/constants/types';

export const mockProducts: Record<string, Product[]> = {
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': [
    {
      id: '437ea407-6bc2-444d-89dc-9a1136e6b6ee',
      name: 'Tacos de Asada',
      description: 'Tacos de carne asada con cebolla, cilantro y salsa',
      price: 45.00,
      image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300',
      businessId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      businessName: 'La Tiendita de Juan',
      category: 'Tacos',
    },
    {
      id: '5b4300f3-85bc-4aa8-9559-30f9397475a8',
      name: 'Torta de Jamón',
      description: 'Torta con jamón, queso, lechuga, tomate y aguacate',
      price: 35.00,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300',
      businessId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      businessName: 'La Tiendita de Juan',
      category: 'Tortas',
    },
    {
      id: '11bd0152-7b19-47e0-857c-8282b100d05e',
      name: 'Quesadilla',
      description: 'Quesadilla de queso Oaxaca con salsa verde',
      price: 25.00,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300',
      businessId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      businessName: 'La Tiendita de Juan',
      category: 'Quesadillas',
    },
  ],
};
