// Playground.js
import React, { useEffect, useRef, useState } from 'react';
import DalleForm from './Dalle-3';

const Playground = (isDesktop) => {
  // Adjust conversation height
  const adjustPlaygroundHeight = () => {
    const headerHeight = document.querySelector('.navbar').offsetHeight;
    const footerHeight = document.querySelector('.footer').offsetHeight;

    const availableHeight = window.innerHeight - headerHeight - footerHeight;
    if (playgroundRef.current) {
      playgroundRef.current.style.height = `${availableHeight + 5}px`;
    }
  };

  useEffect(() => {
    window.addEventListener('resize', adjustPlaygroundHeight);
    adjustPlaygroundHeight();

    return () => {
      window.removeEventListener('resize', adjustPlaygroundHeight);
    };
  }, []);
  const playgroundRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false); // New state
  const [image, setImage] = useState(null);

  const handleDalleRequest = async (formData) => {
    console.log('DALL-E Request:', formData);
    setIsGenerating(true); // Disable the button and set text to 'Generating...'

    try {
      const res = await fetch('https://bfoster-services.herokuapp.com/ai/generate-image-rf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: formData.prompt,
          style: formData.style,
          quality: formData.quality,
          size: formData.size
        }),
      });

      let data = await res.json();
      console.log('DALL-E Response:', data.response);
      setImage(data.response);
    } catch (error) {
      console.log('Error:', error);
    } finally {
      setIsGenerating(false); // Re-enable the button and set text back to 'Generate'
    }
  };
  return (
    <div className={`Playground ${isDesktop ? 'open' : ''}`}>
      <div className="playground-content" ref={playgroundRef}>
        <h1>Playground Page</h1>
        <DalleForm onSubmit={handleDalleRequest} image={image} isGenerating={isGenerating} />
      </div>
    </div>
  );
};

export default Playground;