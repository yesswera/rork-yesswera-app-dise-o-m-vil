// ============================================================================
// YESSWERA: YESSI IA - CHAT SERVICE
// Conecta con Ollama (Phi-3 Mini) via yesswera-api para chatbot inteligente
// ============================================================================

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.147.17.16:3000';

export type YessiContext = 'delivery_client' | 'delivery_driver' | 'delivery_support';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface YessiChatResponse {
  response: string;
  context: YessiContext;
  latency_ms: number;
}

/**
 * Send a message to Yessi AI
 * @param context - Which Yessi personality to use
 * @param message - User message (max 500 chars)
 * @param history - Previous messages for multi-turn context (max 6 kept)
 */
export async function sendToYessi(
  context: YessiContext,
  message: string,
  history: ChatMessage[] = []
): Promise<YessiChatResponse> {
  const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, message, history }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Error ${response.status}`);
  }

  return response.json();
}

/**
 * Check if Yessi AI service is available
 */
export async function checkYessiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/ai/health`, { method: 'GET' });
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}
