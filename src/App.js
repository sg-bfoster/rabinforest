import './App.css';
import React, { useState, useEffect, useLayoutEffect } from 'react';
import Header from './components/Header';
import LinksPanel from './components/LinksPanel';
import Footer from './Footer';
import Playground from './Playground';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AIChatBots from './AI-Chat-Bots';
import AiImageryForm from './Dalle-3';
import FactCheck from './FactCheck';
import DocumentHead from './DocumentHead';
import { PLAYGROUND_CHAT_BOTS } from './playgroundRoutes';
import { FEATURES } from './config/features';
import RabinAIImagery from './RabinAIImagery';
import Modal from './Modal';
import Home from './Home';
import Resume from './Resume';
import Explore from './Explore';
import EmmaSplashPage from './EmmaSplashPage';
import Admin from './Admin';
import SynapseCanvas from './components/SynapseCanvas';
import { HeroProvider, HeroSlot } from './components/Hero';

const AppContent = () => {
  const location = useLocation();
  const [isEmmaReferrer, setIsEmmaReferrer] = useState(false);

  useLayoutEffect(() => {
    window.history.scrollRestoration = 'manual';
  }, []);

  // SPA navigations keep window scroll. Reset to the top on every route;
  // Home then scrolls into an existing conversation after paint.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const referrer = document.referrer;
    const urlParams = new URLSearchParams(location.search);
    const isTestMode = urlParams.get('emma') === 'true';
    const isEmmaDomain = referrer.includes('emmajanefoster.net');
    setIsEmmaReferrer(isEmmaDomain || isTestMode);
  }, [location]);

  if (isEmmaReferrer) {
    return <EmmaSplashPage />;
  }

  return (
    <HeroProvider>
      <div className="app-shell">
        <DocumentHead />
        <Header />
        <div className="hero-shell">
          <div className="hero-layers" aria-hidden="true">
            <div className="hero-sky">
              <img
                className="hero-photo"
                src="/forest-space-background.png"
                alt=""
              />
              <SynapseCanvas />
              <div className="hero-vignette" />
            </div>
            <div className="hero-hairline" />
          </div>
          <HeroSlot />
        </div>
        <main className="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/playground" element={<Playground />}>
              <Route index element={<Navigate to={PLAYGROUND_CHAT_BOTS} replace />} />
              <Route path="ai-chat-bots" element={<AIChatBots />} />
              <Route path="ai-imagery" element={<AiImageryForm />} />
              <Route path="fact-check" element={<FactCheck />} />
              <Route
                path="rabinai-imagery"
                element={FEATURES.rabinaiImagery ? <RabinAIImagery /> : <Navigate to={PLAYGROUND_CHAT_BOTS} replace />}
              />
            </Route>
            <Route path="/explore" element={<Explore />} />
            <Route path="/resume" element={<Resume />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
        <LinksPanel />
        <Modal />
      </div>
    </HeroProvider>
  );
};

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
