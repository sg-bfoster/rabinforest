import React, { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

const HeroSlotContext = createContext({ el: null, setEl: () => {} });

export const HeroProvider = ({ children }) => {
  const [el, setEl] = useState(null);
  return (
    <HeroSlotContext.Provider value={{ el, setEl }}>
      {children}
    </HeroSlotContext.Provider>
  );
};

export const HeroSlot = () => {
  const { setEl } = useContext(HeroSlotContext);
  return <div ref={setEl} className="hero-slot" />;
};

export const Hero = ({ children, variant = 'page' }) => {
  const { el } = useContext(HeroSlotContext);
  if (!el) return null;
  return createPortal(
    <div className={`hero-content hero-content--${variant}`}>{children}</div>,
    el,
  );
};

export const ScreenBody = ({ children, width = 'page' }) => (
  <div className={`page-body page-body--${width}`}>{children}</div>
);
