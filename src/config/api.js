// API Configuration
// Use environment variable for API base URL
// For localhost: set REACT_APP_API_BASE_URL=http://localhost:8080 in .env file
// For production: set REACT_APP_API_BASE_URL=https://bfoster-services.herokuapp.com or leave unset for default
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://bfoster-services.herokuapp.com';

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

