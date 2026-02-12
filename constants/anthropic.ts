// ANTHROPIC (CLAUDE) CONFIGURATION - YESSWERA
// Para validacion de imagenes con Yessi IA (Claude Vision)
// API key se carga desde .env (EXPO_PUBLIC_ANTHROPIC_API_KEY)

export const ANTHROPIC_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  model: 'claude-3-haiku-20240307',
  maxTokens: 300,
  apiUrl: 'https://api.anthropic.com/v1/messages',
};
