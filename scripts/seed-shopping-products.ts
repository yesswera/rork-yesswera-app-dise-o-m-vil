/**
 * Script para poblar productos de prueba para comercios de shopping
 * Ejecutar: npx ts-node scripts/seed-shopping-products.ts
 * O copiar y ejecutar en Supabase SQL Editor
 */

// Productos por categoría de negocio
export const PRODUCTS_BY_CATEGORY: Record<string, Array<{
  name: string;
  description: string;
  price: number;
}>> = {
  farmacia: [
    { name: 'Paracetamol 500mg (20 tabs)', description: 'Analgésico y antipirético', price: 45 },
    { name: 'Ibuprofeno 400mg (10 tabs)', description: 'Antiinflamatorio', price: 65 },
    { name: 'Alcohol 96° (250ml)', description: 'Para desinfección', price: 28 },
    { name: 'Gasas estériles (10 pzas)', description: 'Para curaciones', price: 35 },
    { name: 'Vendas elásticas (5m)', description: 'Para vendajes', price: 42 },
    { name: 'Curitas surtidas (100 pzas)', description: 'Banditas adhesivas', price: 55 },
    { name: 'Vitamina C 1g (30 tabs)', description: 'Suplemento vitamínico', price: 89 },
    { name: 'Antigripal (10 sobres)', description: 'Para síntomas de gripa', price: 78 },
    { name: 'Suero oral (1L)', description: 'Rehidratación', price: 32 },
    { name: 'Termómetro digital', description: 'Medición de temperatura', price: 125 },
    { name: 'Gel antibacterial (500ml)', description: 'Desinfectante de manos', price: 65 },
    { name: 'Cubrebocas KN95 (10 pzas)', description: 'Protección respiratoria', price: 95 },
    { name: 'Jarabe para tos (120ml)', description: 'Alivio de tos seca y con flema', price: 85 },
    { name: 'Pomada para quemaduras', description: 'Tratamiento de quemaduras leves', price: 72 },
    { name: 'Gotas oftálmicas', description: 'Lubricante para ojos secos', price: 98 },
  ],
  abarrotes: [
    { name: 'Arroz (1kg)', description: 'Arroz blanco de grano largo', price: 28 },
    { name: 'Frijol negro (1kg)', description: 'Frijol negro queretano', price: 35 },
    { name: 'Aceite vegetal (1L)', description: 'Aceite para cocinar', price: 42 },
    { name: 'Azúcar (1kg)', description: 'Azúcar estándar', price: 32 },
    { name: 'Sal de mesa (1kg)', description: 'Sal refinada', price: 15 },
    { name: 'Harina de trigo (1kg)', description: 'Para pan y tortillas', price: 28 },
    { name: 'Pasta spaghetti (200g)', description: 'Pasta italiana', price: 18 },
    { name: 'Atún en agua (140g)', description: 'Atún enlatado', price: 24 },
    { name: 'Leche entera (1L)', description: 'Leche pasteurizada', price: 26 },
    { name: 'Huevos (12 pzas)', description: 'Huevos frescos de rancho', price: 48 },
    { name: 'Café soluble (200g)', description: 'Café instantáneo', price: 85 },
    { name: 'Galletas Marías (400g)', description: 'Galletas tradicionales', price: 32 },
    { name: 'Pan Bimbo (mediano)', description: 'Pan de caja blanco', price: 45 },
    { name: 'Mayonesa (400g)', description: 'Mayonesa con limón', price: 55 },
    { name: 'Salsa Valentina (370ml)', description: 'Salsa picante mexicana', price: 22 },
    { name: 'Jabón de barra (3 pzas)', description: 'Jabón para ropa', price: 38 },
    { name: 'Detergente (1kg)', description: 'Detergente en polvo', price: 65 },
    { name: 'Cloro (1L)', description: 'Blanqueador desinfectante', price: 25 },
  ],
  ferreteria: [
    { name: 'Martillo de uña', description: 'Martillo de acero con mango de madera', price: 125 },
    { name: 'Desarmadores (juego 6 pzas)', description: 'Planos y de cruz', price: 145 },
    { name: 'Pinzas de presión', description: 'Pinzas ajustables', price: 95 },
    { name: 'Cinta de aislar (10m)', description: 'Cinta aislante negra', price: 28 },
    { name: 'Tornillos surtidos (100 pzas)', description: 'Varios tamaños', price: 55 },
    { name: 'Clavos 2" (100g)', description: 'Clavos para madera', price: 22 },
    { name: 'Taladro manual', description: 'Taladro de mano con brocas', price: 185 },
    { name: 'Flexómetro 5m', description: 'Cinta métrica retráctil', price: 75 },
    { name: 'Nivel de burbuja (30cm)', description: 'Nivel de aluminio', price: 85 },
    { name: 'Llave inglesa 10"', description: 'Llave ajustable', price: 165 },
    { name: 'Silicón transparente', description: 'Sellador multiusos', price: 65 },
    { name: 'Brocha 3"', description: 'Para pintura', price: 45 },
    { name: 'Lija #120 (5 pzas)', description: 'Lija para madera', price: 35 },
    { name: 'Cable eléctrico 12AWG (10m)', description: 'Cable para instalación', price: 125 },
    { name: 'Apagador sencillo', description: 'Interruptor de luz', price: 35 },
    { name: 'Contacto doble', description: 'Toma de corriente', price: 42 },
    { name: 'Foco LED 9W', description: 'Foco ahorrador luz blanca', price: 55 },
  ],
  carniceria: [
    { name: 'Bistec de res (kg)', description: 'Corte delgado para asar', price: 185 },
    { name: 'Carne molida de res (kg)', description: 'Molida fresca', price: 155 },
    { name: 'Costilla de res (kg)', description: 'Para caldos y asados', price: 145 },
    { name: 'Pechuga de pollo (kg)', description: 'Sin hueso', price: 98 },
    { name: 'Pierna de pollo (kg)', description: 'Con muslo', price: 65 },
    { name: 'Milanesa de pollo (kg)', description: 'Empanizada lista', price: 125 },
    { name: 'Chuleta de cerdo (kg)', description: 'Con hueso', price: 125 },
    { name: 'Chorizo casero (kg)', description: 'Chorizo rojo estilo Jalisco', price: 145 },
    { name: 'Tocino (500g)', description: 'Rebanado', price: 95 },
    { name: 'Longaniza (kg)', description: 'Longaniza fresca', price: 135 },
    { name: 'Arrachera (kg)', description: 'Corte premium para asar', price: 245 },
    { name: 'Hígado de res (kg)', description: 'Fresco', price: 85 },
    { name: 'Carnitas (kg)', description: 'Cerdo cocido', price: 195 },
    { name: 'Chicharrón seco (250g)', description: 'Para guisar', price: 75 },
  ],
  tienda: [
    { name: 'Coca-Cola (600ml)', description: 'Refresco de cola', price: 22 },
    { name: 'Sabritas clásicas', description: 'Papas fritas', price: 25 },
    { name: 'Gansito', description: 'Pastelito Marinela', price: 18 },
    { name: 'Cigarros Marlboro (20)', description: 'Cajetilla roja', price: 78 },
    { name: 'Recarga Telcel $50', description: 'Tiempo aire', price: 50 },
    { name: 'Agua Ciel (1L)', description: 'Agua purificada', price: 15 },
    { name: 'Cerveza XX Lager (355ml)', description: 'Cerveza clara', price: 25 },
    { name: 'Chicles Trident', description: 'Chicle sin azúcar', price: 15 },
    { name: 'Halls mentol', description: 'Dulces refrescantes', price: 12 },
    { name: 'Hot Dog preparado', description: 'Con todo', price: 35 },
    { name: 'Café preparado', description: 'Café americano caliente', price: 25 },
    { name: 'Doritos Nacho', description: 'Totopos con queso', price: 28 },
    { name: 'Boing de mango (500ml)', description: 'Jugo de mango', price: 18 },
    { name: 'Snickers', description: 'Barra de chocolate', price: 28 },
  ],
  electronica: [
    { name: 'Cable USB-C (1m)', description: 'Cable de carga rápida', price: 85 },
    { name: 'Audífonos Bluetooth', description: 'Inalámbricos con micrófono', price: 350 },
    { name: 'Cargador USB dual', description: 'Cargador de pared 2 puertos', price: 145 },
    { name: 'Power Bank 10000mAh', description: 'Batería portátil', price: 450 },
    { name: 'Funda para celular', description: 'Silicón transparente universal', price: 65 },
    { name: 'Mica de cristal templado', description: 'Protector de pantalla', price: 85 },
    { name: 'Mouse inalámbrico', description: 'Mouse USB 2.4GHz', price: 185 },
    { name: 'Teclado USB', description: 'Teclado español básico', price: 195 },
    { name: 'Hub USB 4 puertos', description: 'Expansor USB 2.0', price: 125 },
    { name: 'Memoria USB 32GB', description: 'Pendrive', price: 145 },
    { name: 'Tarjeta MicroSD 64GB', description: 'Con adaptador', price: 195 },
    { name: 'Bocina Bluetooth', description: 'Bocina portátil', price: 385 },
    { name: 'Cable HDMI (2m)', description: 'Cable HD 1080p', price: 125 },
    { name: 'Adaptador USB-C a 3.5mm', description: 'Para audífonos', price: 95 },
    { name: 'Lámpara LED USB', description: 'Luz de escritorio', price: 75 },
  ],
  supermercado: [
    { name: 'Canasta básica familiar', description: 'Arroz, frijol, aceite, sal, huevos', price: 250 },
    { name: 'Frutas surtidas (2kg)', description: 'Manzana, plátano, naranja', price: 85 },
    { name: 'Verduras surtidas (2kg)', description: 'Tomate, cebolla, chile, limón', price: 75 },
    { name: 'Paquete de limpieza', description: 'Jabón, cloro, detergente, escoba', price: 185 },
    { name: 'Leche (6 pack 1L)', description: 'Leche entera UHT', price: 135 },
    { name: 'Cereal de caja (500g)', description: 'Corn Flakes', price: 75 },
    { name: 'Yogurt (4 pack)', description: 'Yogurt natural o sabor', price: 55 },
    { name: 'Queso Oaxaca (500g)', description: 'Queso para quesadillas', price: 95 },
    { name: 'Jamón de pavo (500g)', description: 'Jamón bajo en grasa', price: 85 },
    { name: 'Pan dulce surtido (6 pzas)', description: 'Conchas, cuernos, orejas', price: 48 },
    { name: 'Tortillas de maíz (1kg)', description: 'Tortillas frescas', price: 22 },
    { name: 'Refrescos (6 pack 355ml)', description: 'Coca, Fanta o Sprite', price: 85 },
    { name: 'Agua embotellada (12 pack)', description: 'Botellas 500ml', price: 65 },
    { name: 'Papel higiénico (12 rollos)', description: 'Doble hoja', price: 125 },
    { name: 'Servilletas (500 pzas)', description: 'Servilletas blancas', price: 45 },
    { name: 'Bolsas para basura (50 pzas)', description: 'Tamaño grande', price: 55 },
    { name: 'Aceite de oliva (500ml)', description: 'Extra virgen', price: 145 },
    { name: 'Pasta dental (3 pack)', description: 'Colgate o similar', price: 75 },
    { name: 'Shampoo (750ml)', description: 'Para toda la familia', price: 85 },
    { name: 'Jabón de baño (6 pack)', description: 'Jabón de tocador', price: 65 },
  ],
};

// SQL para insertar productos (copiar a Supabase SQL Editor)
export function generateInsertSQL(businessId: string, category: string): string {
  const products = PRODUCTS_BY_CATEGORY[category] || [];
  if (products.length === 0) return '';

  const values = products.map(p =>
    `('${businessId}', '${p.name.replace(/'/g, "''")}', '${p.description.replace(/'/g, "''")}', ${p.price}, true)`
  ).join(',\n  ');

  return `
INSERT INTO products (business_id, name, description, price, is_available)
VALUES
  ${values};
`;
}

// Ejemplo de uso
console.log(`
-- =============================================
-- SQL para insertar productos de prueba
-- Copiar y ejecutar en Supabase SQL Editor
-- =============================================

-- Primero obtén los IDs de los negocios:
-- SELECT id, business_name, category FROM businesses;

-- Luego ejecuta cada INSERT con el ID correspondiente
`);

// Generar SQL de ejemplo para cada categoría
Object.keys(PRODUCTS_BY_CATEGORY).forEach(category => {
  console.log(`\n-- Productos para negocio de ${category.toUpperCase()}`);
  console.log(`-- Reemplazar 'BUSINESS_ID_AQUI' con el ID real del negocio`);
  console.log(generateInsertSQL('BUSINESS_ID_AQUI', category));
});
