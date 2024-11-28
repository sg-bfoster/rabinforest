import React, { useState } from 'react';

const DalleForm = ({ onSubmit, image, isGenerating }) => {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024'); // Default size
  const [quality, setQuality] = useState('standard'); // Default quality
  const [style, setStyle] = useState('natural'); // Default style

  const handleSubmit = (e) => {
    e.preventDefault();

    // Call the onSubmit handler with form data
    onSubmit({
      prompt,
      size,
      quality,
      style,
      numImages: 1, // Fixed number of images as per the previous implementation
    });
  };

  return (
    <div className="dalle">
      <div className="form-container">
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
              rows="6"
              placeholder="Describe the image you want to generate"
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
        <div className="response-image">
          <label htmlFor="style" className="form-label">
            Image:
          </label>
          {image && <img className='dalle-3-image' src={image} alt="Generated" />}
        </div>
      </div>
    </div>
  );
};

export default DalleForm;