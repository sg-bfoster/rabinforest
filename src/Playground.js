// Playground.js
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { pathForView } from './playgroundRoutes';

const Playground = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const view = queryParams.get('view');

  // Retired ?view= query URLs — send bookmarks/crawlers to path routes.
  if (view) {
    return <Navigate to={pathForView(view)} replace />;
  }

  return <Outlet />;
};

export default Playground;
