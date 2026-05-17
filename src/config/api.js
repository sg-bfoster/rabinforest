// API configuration — bfoster-services backend
const PRODUCTION_API_URL =
  import.meta.env.VITE_API_PRODUCTION_URL ||
  'https://bfoster-services.herokuapp.com';

const LOCAL_API_URL =
  import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:8081';

const resolveTargetFromHostname = () => {
  if (typeof window === 'undefined') {
    return 'local';
  }
  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === 'localhost' || hostname === '127.0.0.1';
  return isLocalHost ? 'local' : 'production';
};

const getApiBaseUrl = () => {
  // Explicit override (full URL) — legacy / advanced
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }

  const target = (
    import.meta.env.VITE_API_TARGET || resolveTargetFromHostname()
  ).toLowerCase();

  if (target === 'production') {
    return PRODUCTION_API_URL.replace(/\/$/, '');
  }
  if (target === 'local') {
    return LOCAL_API_URL.replace(/\/$/, '');
  }

  console.warn(
    `Unknown VITE_API_TARGET="${target}"; expected "local" or "production". Using local.`,
  );
  return LOCAL_API_URL.replace(/\/$/, '');
};

const API_BASE_URL = getApiBaseUrl();

if (import.meta.env.DEV) {
  console.log('🔗 API target:', import.meta.env.VITE_API_TARGET || '(auto)');
  console.log('🔗 API Base URL:', API_BASE_URL);
}

export const API_ENDPOINTS = {
  ASSISTANT: `${API_BASE_URL}/ai/assistant`,
  GEMINI_ASSISTANT: `${API_BASE_URL}/ai/gemini-assistant`,
  GENERATE_TEXT_GEMINI: `${API_BASE_URL}/ai/generate-text-gemini`,
  AI_CHAT: `${API_BASE_URL}/ai/ai-chat`,
  GENERATE_IMAGE_RF: `${API_BASE_URL}/ai/generate-image-rf`,
  GENERATE_IMAGE_RF_IMAGEN: `${API_BASE_URL}/ai/generate-image-rf-imagen`,
  ASSISTANT_BFOSTER: `${API_BASE_URL}/ai/assistant-bfoster`,
  ASSISTANT_BFOSTER_SAVE: `${API_BASE_URL}/ai/assistant-bfoster`,
  CONVERSATION_LOGS: `${API_BASE_URL}/ai/conversation-logs`,
  DELETE_CONVERSATION: (conversationId) =>
    `${API_BASE_URL}/ai/conversation-logs/${conversationId}`,
};

export default API_BASE_URL;
