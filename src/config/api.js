// API Configuration
// Automatically detects production vs localhost based on domain
const getApiBaseUrl = () => {
  // Check if we're running on a production domain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProduction = hostname === 'rabinforest.com' || 
                        hostname === 'www.rabinforest.com' ||
                        (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'));
    
    if (isProduction) {
      return 'https://bfoster-services.herokuapp.com';
    }
  }
  
  // For localhost development, use env var or default to localhost:8081
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:8081';
};

const API_BASE_URL = getApiBaseUrl();

// Log the API base URL in development (helps verify local vs production)
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', API_BASE_URL);
}

export const API_ENDPOINTS = {
  ASSISTANT: `${API_BASE_URL}/ai/assistant`,
  GEMINI_ASSISTANT: `${API_BASE_URL}/ai/gemini-assistant`,
  GENERATE_TEXT_GEMINI: `${API_BASE_URL}/ai/generate-text-gemini`,
  AI_CHAT: `${API_BASE_URL}/ai/ai-chat`,
  GENERATE_IMAGE_RF: `${API_BASE_URL}/ai/generate-image-rf`,
  ASSISTANT_BFOSTER: `${API_BASE_URL}/ai/assistant-bfoster`,
  ASSISTANT_BFOSTER_SAVE: `${API_BASE_URL}/ai/assistant-bfoster`,
};

export default API_BASE_URL;

