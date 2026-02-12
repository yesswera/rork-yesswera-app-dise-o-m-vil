// ============================================================================
// YESSWERA: YESSI IA - VALIDACION DE IMAGENES CON CLAUDE VISION
// Analiza si la imagen del producto corresponde al nombre dado
// Permisivo con variaciones regionales de Mexico
// ============================================================================

import { ANTHROPIC_CONFIG } from '@/constants/anthropic';

// ============================================================================
// TIPOS
// ============================================================================

export type YessiResult = {
  status: 'approved' | 'warning' | 'skipped' | 'error';
  explanation: string;
};

// ============================================================================
// VALIDAR IMAGEN CON CLAUDE VISION
// ============================================================================

export async function validateProductImage(
  base64: string,
  productName: string
): Promise<YessiResult> {
  // Si no hay nombre, no validar
  if (!productName.trim()) {
    return { status: 'skipped', explanation: '' };
  }

  try {
    const response = await fetch(ANTHROPIC_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_CONFIG.model,
        max_tokens: ANTHROPIC_CONFIG.maxTokens,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Eres Yessi, asistente de Yesswera (app de delivery en Tomatlan, Jalisco, Mexico).

Analiza si esta imagen corresponde al producto llamado "${productName}".

Se permisivo con:
- Variaciones regionales mexicanas (ej: "torta" puede verse diferente en cada estado)
- Presentaciones caseras vs profesionales
- Nombres coloquiales (ej: "cheve" = cerveza, "elote" = maiz)
- Fotos no perfectas (angulo, iluminacion)

Responde SOLO con JSON valido, sin markdown:
{"match": true/false, "confidence": 0-100, "explanation": "texto breve en espanol"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Yessi Vision API error:', response.status);
      return { status: 'error', explanation: 'Error al conectar con Yessi IA' };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    // Parsear JSON de la respuesta
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { status: 'error', explanation: 'Respuesta inesperada de Yessi' };
    }

    const result = JSON.parse(jsonMatch[0]);
    const confidence = Number(result.confidence) || 0;

    if (confidence >= 70) {
      return { status: 'approved', explanation: result.explanation || '' };
    } else {
      return { status: 'warning', explanation: result.explanation || 'La imagen podria no corresponder al producto' };
    }
  } catch (error) {
    console.error('Yessi Vision error:', error);
    return { status: 'error', explanation: 'No se pudo analizar la imagen' };
  }
}
