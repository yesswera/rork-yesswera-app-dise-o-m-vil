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

export type DocValidationResult = {
  status: 'valid' | 'warning' | 'rejected' | 'skipped' | 'error';
  explanation: string;
  confidence: number;
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
    if (!ANTHROPIC_CONFIG.apiKey) {
      console.warn('Yessi Vision: API key no configurada');
      return { status: 'skipped', explanation: '' };
    }

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
      const errorBody = await response.text().catch(() => '');
      console.error('Yessi Vision API error:', response.status, errorBody);
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

// ============================================================================
// VALIDAR DOCUMENTO DE IDENTIDAD CON CLAUDE VISION
// Pre-screening automatico antes de revision admin
// ============================================================================

const DOC_PROMPTS: Record<string, string> = {
  ine_front: `Analiza si esta imagen es el FRENTE de una credencial INE/IFE mexicana.
Verifica:
1. Se ve una credencial de elector mexicana por el frente
2. La foto es legible (no borrosa, no cortada, no oscura)
3. Se distingue foto, nombre y datos del titular`,

  ine_back: `Analiza si esta imagen es el REVERSO de una credencial INE/IFE mexicana.
Verifica:
1. Se ve la parte trasera de una credencial de elector
2. Se distingue el codigo de barras o QR
3. La foto es legible`,

  selfie: `Analiza si esta imagen es una SELFIE de una persona sosteniendo una credencial INE/IFE.
Verifica:
1. Se ve una persona real (no foto de foto)
2. La persona sostiene una credencial al lado de su cara
3. Se ve tanto la cara como la credencial claramente`,

  proof_of_address: `Analiza si esta imagen es un COMPROBANTE DE DOMICILIO mexicano.
Verifica:
1. Es un recibo de servicio (luz CFE, agua, telefono, gas, internet) o estado de cuenta bancario
2. Se ve una direccion
3. El documento es legible`,

  license_front: `Analiza si esta imagen es el FRENTE de una LICENCIA DE CONDUCIR mexicana.
Verifica:
1. Se ve una licencia de conducir
2. Se distingue foto y datos del titular
3. La foto es legible`,

  license_back: `Analiza si esta imagen es el REVERSO de una LICENCIA DE CONDUCIR mexicana.
Verifica:
1. Se ve la parte trasera de una licencia de conducir
2. La foto es legible`,
};

export async function validateDocument(
  base64: string,
  docType: string,
): Promise<DocValidationResult> {
  try {
    if (!ANTHROPIC_CONFIG.apiKey) {
      return { status: 'skipped', explanation: '', confidence: 0 };
    }

    const docPrompt = DOC_PROMPTS[docType];
    if (!docPrompt) {
      return { status: 'skipped', explanation: '', confidence: 0 };
    }

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
                text: `Eres Yessi, asistente de verificacion de Yesswera (app de delivery en Mexico).

${docPrompt}

Se permisiva con:
- Calidad de foto no profesional (celular)
- Credenciales con desgaste normal
- Diferentes formatos de recibos mexicanos

Pero rechaza si:
- La imagen esta muy borrosa o cortada y NO se puede leer
- No es el tipo de documento solicitado (ej: foto random en vez de INE)
- Es una foto de pantalla de otro documento digital (screenshot)

Responde SOLO con JSON valido, sin markdown:
{"valid": true/false, "confidence": 0-100, "explanation": "texto breve en espanol"}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Yessi Doc Validation error:', response.status);
      return { status: 'error', explanation: 'Error al conectar con Yessi IA', confidence: 0 };
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { status: 'error', explanation: 'Respuesta inesperada', confidence: 0 };
    }

    const result = JSON.parse(jsonMatch[0]);
    const confidence = Number(result.confidence) || 0;

    if (result.valid && confidence >= 70) {
      return { status: 'valid', explanation: result.explanation || '', confidence };
    } else if (result.valid && confidence >= 40) {
      return { status: 'warning', explanation: result.explanation || 'Revisa la calidad de la imagen', confidence };
    } else {
      return { status: 'rejected', explanation: result.explanation || 'El documento no parece valido', confidence };
    }
  } catch (error) {
    console.error('Yessi Doc Validation error:', error);
    return { status: 'error', explanation: 'No se pudo analizar el documento', confidence: 0 };
  }
}
