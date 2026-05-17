import { API_ENDPOINTS } from '../config/api';
import { isDataImageUrl, toDisplayUrl } from '../utils/imageUrl';

const postImageRequest = async (apiUrl, body) => {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  const dataUrl = data.response;
  const url = isDataImageUrl(dataUrl) ? toDisplayUrl(dataUrl) : dataUrl;
  return { url, dataUrl, revisedPrompt: data.revisedPrompt, prompt: body.prompt };
};

const generateOpenAIImage = ({ prompt, aspect, quality, style }) =>
  postImageRequest(API_ENDPOINTS.GENERATE_IMAGE_RF, {
    prompt,
    aspect,
    quality,
    style,
  });

const generateImagenImage = ({ prompt, aspect, style }) =>
  postImageRequest(API_ENDPOINTS.GENERATE_IMAGE_RF_IMAGEN, {
    prompt,
    aspect,
    style,
  });

const generateComparison = async ({ prompt, aspect, quality, style }) => {
  const payload = { prompt, aspect, quality, style };
  const [openaiResult, imagenResult] = await Promise.allSettled([
    generateOpenAIImage(payload),
    generateImagenImage(payload),
  ]);

  return {
    openai: openaiResult.status === 'fulfilled' ? openaiResult.value : null,
    imagen: imagenResult.status === 'fulfilled' ? imagenResult.value : null,
    errors: {
      openai: openaiResult.status === 'rejected' ? openaiResult.reason : null,
      imagen: imagenResult.status === 'rejected' ? imagenResult.reason : null,
    },
  };
};

const imageService = {
  generateOpenAIImage,
  generateImagenImage,
  generateComparison,
};

export default imageService;
