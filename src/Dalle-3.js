import React, { useState, useEffect, useRef } from 'react';

const DalleForm = () => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024'); // Default size
  const [quality, setQuality] = useState('standard'); // Default quality
  const [style, setStyle] = useState('natural'); // Default style
  const [isGenerating, setIsGenerating] = useState(false); // State for button
  const [image, setImage] = useState(null);
  const [error, setError] = useState(null);

  const imageRef = useRef(null);
  const errorRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsGenerating(true); // Disable button and update text
    setError(null); // Reset error message
    setImage(null); // Reset image

    try {
      const res = await fetch('https://bfoster-services.herokuapp.com/ai/generate-image-rf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          size,
          quality,
          style,
          numImages: 1, // Fixed number of images as per the previous implementation
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('DALL-E Response:', data.response);
      setImage(data.response); // Update image state
    } catch (error) {
      console.error('Error generating image:', error); // Log error
      setError('Error generating image. Please try again.');
    } finally {
      setIsGenerating(false); // Re-enable button and reset text
    }
  };

  useEffect(() => {
    if (image && imageRef.current) {
      // Scroll to the image when it is added
      imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (error && errorRef.current) {
      // Scroll to the error when it is added
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [image, error]);

  return (
    <div className="dalle">
      <div className={`form-container ${isGenerating ? 'generating' : ''}`}>
        <h2>DALL-E 3 Image Generator</h2>
        <form onSubmit={handleSubmit} className="dalle-form">
          {/* Text Area */}
          <div className="form-left">
            <label htmlFor="prompt" className="form-label">
              Image Prompt:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows="4"
              placeholder="Describe an image to generate. Ex: A red apple floating in space."
              required
              className="form-textarea"
            />
          </div>

          {/* Select Fields */}
          <div className="form-right">
            <div className="form-group">
              <label htmlFor="size" className="form-label">
                Image Size:
              </label>
              <select
                id="size"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="form-select"
              >
                <option value="1024x1024">1024x1024 (Square)</option>
                <option value="1792x1024">1792x1024 (Landscape)</option>
                <option value="1024x1792">1024x1792 (Portrait)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="quality" className="form-label">
                Quality:
              </label>
              <select
                id="quality"
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                className="form-select"
              >
                <option value="standard">Standard</option>
                <option value="hd">HD</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="style" className="form-label">
                Style:
              </label>
              <select
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="form-select"
              >
                <option value="natural">Natural</option>
                <option value="vivid">Vivid</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-button-container">
            <button
              type="submit"
              className="form-button"
              disabled={isGenerating} // Disable button while generating
            >
              {isGenerating ? 'Generating...' : 'Generate Image'}
            </button>
          </div>
        </form>
        <div className="response">
          <div className="response-image" ref={imageRef}>
            <label htmlFor="style" className="form-label">
              Image:
            </label>
            {image && <img className="dalle-3-image" src={image} alt="Generated" />}
          </div>
          {/* Error Message */}
          <p ref={errorRef} className="error-message">
            {error}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DalleForm;