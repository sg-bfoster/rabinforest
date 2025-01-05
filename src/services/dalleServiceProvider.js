const generateImage = async ({ prompt, size, quality, style }) => {
    const apiUrl = 'https://bfoster-services.herokuapp.com/ai/generate-image-rf'; //https://bfoster-services.herokuapp.com/ai/generate-image-rf
  
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          size,
          quality,
          style,
          numImages: 1, // Fixed number of images
        }),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      return {url: data.response, revisedPrompt: data.revisedPrompt, prompt}; // Return the full response for further processing
    } catch (error) {
      console.error('Error generating image:', error);
      throw error; // Re-throw to be handled by the calling component
    }
  };
  
  const dalleService = {
    generateImage,
  };
  
  export default dalleService;