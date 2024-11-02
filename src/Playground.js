// Playground.js
import React from 'react';

const Playground = (isDesktop) => {
  return (
    <div className={`Playground ${isDesktop ? 'open' : ''}`}>
      <h1>Playground Page</h1>
      <p>Coming soon!</p>
    </div>
  );
};

export default Playground;