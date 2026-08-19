// Playground.js
import React, { useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { pathForView } from './playgroundRoutes';

const Playground = (isDesktop) => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const view = queryParams.get('view');
  const playgroundRef = useRef(null);

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

  // Retired ?view= query URLs — send bookmarks/crawlers to path routes.
  if (view) {
    return <Navigate to={pathForView(view)} replace />;
  }

  return (
    <div className={`Playground ${isDesktop ? 'open' : ''}`}>
      <div className="playground-content" ref={playgroundRef}>
        <h1 className="playground-h1">Playground</h1>
        <Outlet />
      </div>
    </div>
  );
};

export default Playground;
