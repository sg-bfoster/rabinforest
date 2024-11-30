// Playground.js
import React, { useEffect, useRef } from 'react';
import DalleForm from './Dalle-3';

const Playground = (isDesktop) => {

  const adjustPlaygroundHeight = () => {
    const header = document.querySelector('.navbar');
    const footer = document.querySelector('.footer');

    const headerHeight = header ? header.offsetHeight : 0;
    const footerHeight = footer ? footer.offsetHeight : 0;

    const availableHeight = window.innerHeight - headerHeight - footerHeight;
    if (playgroundRef.current) {
      playgroundRef.current.style.height = `${availableHeight}px`;
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

  return (
    <div className={`Playground ${isDesktop ? 'open' : ''}`}>
      <div className="playground-content" ref={playgroundRef}>
        <h1>Playground Page</h1>
        <DalleForm />
      </div>
    </div>
  );
};

export default Playground;