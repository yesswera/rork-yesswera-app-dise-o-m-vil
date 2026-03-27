/**
 * Servicio de Tiempos Dinamicos - Yesswera
 * Calcula tiempos de entrega basados en distancia, trafico, hora, etc.
 */

// Velocidades promedio por tipo de vehiculo (km/h)
const VELOCIDAD_PROMEDIO: Record<string, number> = {
  moto: 25,
  bicicleta: 12,
  auto: 20,
  pie: 5,
};

// Factores de ajuste
const FACTORES = {
  hora_pico_almuerzo: { start: 12, end: 14, factor: 1.4 },
  hora_pico_cena: { start: 19, end: 21, factor: 1.4 },
  fin_semana: 1.2,
  lluvia: 1.5,
  noche: 0.8, // menos trafico
};

interface TiempoEstimado {
  tiempoPreparacion: number;
  tiempoTraslado: number;
  buffer: number;
  tiempoTotal: number;
  rango: {
    minimo: number;
    maximo: number;
  };
  factoresAplicados: string[];
}

interface CalcularTiempoParams {
  distanciaKm: number;
  tipoVehiculo?: string;
  tiempoPreparacion: number;
  horaActual?: Date;
  clima?: 'normal' | 'lluvia' | 'tormenta';
}

/**
 * Calcula el tiempo estimado de entrega considerando multiples factores
 */
export function calcularTiempoEntrega(params: CalcularTiempoParams): TiempoEstimado {
  const {
    distanciaKm,
    tipoVehiculo = 'moto',
    tiempoPreparacion,
    horaActual = new Date(),
    clima = 'normal',
  } = params;

  const factoresAplicados: string[] = [];

  // Tiempo base de traslado
  const velocidad = VELOCIDAD_PROMEDIO[tipoVehiculo] || 20;
  let tiempoTraslado = (distanciaKm / velocidad) * 60; // en minutos

  // Aplicar factor hora pico almuerzo
  const hora = horaActual.getHours();
  if (hora >= FACTORES.hora_pico_almuerzo.start && hora <= FACTORES.hora_pico_almuerzo.end) {
    tiempoTraslado *= FACTORES.hora_pico_almuerzo.factor;
    factoresAplicados.push('hora_pico_almuerzo');
  }

  // Aplicar factor hora pico cena
  if (hora >= FACTORES.hora_pico_cena.start && hora <= FACTORES.hora_pico_cena.end) {
    tiempoTraslado *= FACTORES.hora_pico_cena.factor;
    factoresAplicados.push('hora_pico_cena');
  }

  // Aplicar factor fin de semana
  const diaSemana = horaActual.getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    tiempoTraslado *= FACTORES.fin_semana;
    factoresAplicados.push('fin_semana');
  }

  // Aplicar factor clima
  if (clima === 'lluvia') {
    tiempoTraslado *= FACTORES.lluvia;
    factoresAplicados.push('lluvia');
  } else if (clima === 'tormenta') {
    tiempoTraslado *= FACTORES.lluvia * 1.2;
    factoresAplicados.push('tormenta');
  }

  // Aplicar factor noche (menos trafico)
  if (hora >= 22 || hora <= 6) {
    tiempoTraslado *= FACTORES.noche;
    factoresAplicados.push('noche');
  }

  // Tiempo total
  const tiempoTotal = tiempoPreparacion + tiempoTraslado;

  // Buffer de seguridad (20%)
  const buffer = tiempoTotal * 0.2;

  return {
    tiempoPreparacion,
    tiempoTraslado: Math.round(tiempoTraslado),
    buffer: Math.round(buffer),
    tiempoTotal: Math.round(tiempoTotal + buffer),
    rango: {
      minimo: Math.round(tiempoTotal),
      maximo: Math.round(tiempoTotal + buffer * 2),
    },
    factoresAplicados,
  };
}

/**
 * Calcula el tiempo de alerta para detectar driver quieto
 * Retorna el tiempo en minutos que deberia tardar en recorrer la distancia
 */
export function calcularTiempoAlerta(
  distanciaRestanteKm: number,
  tipoVehiculo: string = 'moto'
): number {
  const velocidad = VELOCIDAD_PROMEDIO[tipoVehiculo] || 20;
  const tiempoBase = (distanciaRestanteKm / velocidad) * 60;
  const buffer = tiempoBase * 0.3; // 30% extra
  return Math.max(3, Math.round(tiempoBase + buffer)); // minimo 3 minutos
}

/**
 * Formatea el tiempo para mostrar al usuario
 */
export function formatearTiempoEstimado(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (mins === 0) {
    return `${horas}h`;
  }
  return `${horas}h ${mins}min`;
}

/**
 * Genera el mensaje de tiempo para el cliente
 */
export function generarMensajeTiempo(estimado: TiempoEstimado): string {
  const { rango } = estimado;
  return `${rango.minimo}-${rango.maximo} minutos`;
}

/**
 * Calcula el punto del 50% del tiempo para notificacion intermedia
 */
export function calcularPunto50Porciento(tiempoTotal: number, inicioTimestamp: number): number {
  const mitad = tiempoTotal / 2;
  return inicioTimestamp + mitad * 60 * 1000; // en milliseconds
}

/**
 * Verifica si es hora pico
 */
export function esHoraPico(fecha: Date = new Date()): boolean {
  const hora = fecha.getHours();
  return (
    (hora >= FACTORES.hora_pico_almuerzo.start && hora <= FACTORES.hora_pico_almuerzo.end) ||
    (hora >= FACTORES.hora_pico_cena.start && hora <= FACTORES.hora_pico_cena.end)
  );
}

/**
 * Estima la distancia entre dos puntos (formula Haversine simplificada)
 */
export function calcularDistanciaKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
