import React, { useState, useEffect, useRef } from 'react';
import DalleService from './services/dalleServiceProvider';
import { useDispatch } from 'react-redux';
import { addLink } from './features/assistantSlice';

const DalleForm = () => {
  const dispatch = useDispatch();
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
    setIsGenerating(true);
    setError(null);
    setImage(null);


  try {
      const generatedImage = await DalleService.generateImage({ prompt, size, quality, style });
      console.log('DALL-E Response:', generatedImage);
      setImage(generatedImage);
      dispatch(addLink({'url': generatedImage, 'text': prompt}));
      //savePersistentLinks(generatedImage); 
    } catch (err) {
      setError('Error generating image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (image && imageRef.current) {
      setTimeout(() => {
        imageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1000);
    }
    if (error && errorRef.current) {
      setTimeout(() => {
        errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 1000);
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
              disabled={isGenerating}
              onKeyDown={handleKeyDown}
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
                disabled={isGenerating}
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
                disabled={isGenerating}
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
                disabled={isGenerating}
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
              className="form-button submit"
              disabled={isGenerating}
            >
              {isGenerating ? <span className="spinner"></span> : 'Generate Image'}
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