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
  ASSISTANT_WARM: `${API_BASE_URL}/ai/assistant/warm`,
  AI_CHAT: `${API_BASE_URL}/ai/ai-chat`,
  FACT_CHECK: `${API_BASE_URL}/ai/fact-check`,
  GENERATE_IMAGE_RF: `${API_BASE_URL}/ai/generate-image-rf`,
  GENERATE_IMAGE_RF_IMAGEN: `${API_BASE_URL}/ai/generate-image-rf-imagen`,
  ASSISTANT_BFOSTER: `${API_BASE_URL}/ai/assistant-bfoster`,
  ASSISTANT_BFOSTER_SAVE: `${API_BASE_URL}/ai/assistant-bfoster`,
  ADMIN_VERIFY: `${API_BASE_URL}/ai/admin/verify`,
  CONVERSATION_LOGS: `${API_BASE_URL}/ai/conversation-logs`,
  DELETE_CONVERSATION: (conversationId) =>
    `${API_BASE_URL}/ai/conversation-logs/${conversationId}`,
};

/** sessionStorage key for the admin credential typed at login (never baked into the bundle) */
export const ADMIN_KEY_STORAGE = 'rf-admin-key';

export const clearAdminSession = () => {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  }
};

/**
 * Headers for bfoster-services routes gated by ADMIN_API_KEY.
 * Only the value typed at Admin login — nothing from VITE_ or source.
 */
export const getAdminHeaders = () => {
  const key =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem(ADMIN_KEY_STORAGE) || ''
      : '';
  return key ? { 'X-Admin-Key': key } : {};
};

export default API_BASE_URL;
