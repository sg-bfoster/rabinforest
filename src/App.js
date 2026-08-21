import './App.css';
import React, { useState, useEffect } from 'react';
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
import Modal from './Modal';
import Home from './Home';
import Resume from './Resume';
import EmmaSplashPage from './EmmaSplashPage';
import Admin from './Admin';

// Helper component to access location
const AppContent = () => {
  const location = useLocation();
  const [isEmmaReferrer, setIsEmmaReferrer] = useState(false);

  useEffect(() => {
    // Check if the referrer is emmajanefoster.net
    const referrer = document.referrer;

    // Check for URL parameter for testing
    const urlParams = new URLSearchParams(location.search);
    const isTestMode = urlParams.get('emma') === 'true';

    const isEmmaDomain = referrer.includes('emmajanefoster.net');

    setIsEmmaReferrer(isEmmaDomain || isTestMode);
  }, [location]);

  // If the user came from emmajanefoster.net, show only the Emma splash page
  if (isEmmaReferrer) {
    return <EmmaSplashPage />;
  }

  return (
    <div className="app-shell">
      <DocumentHead />
      <Header />
      <main className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/playground" element={<Playground />}>
            <Route index element={<Navigate to={PLAYGROUND_CHAT_BOTS} replace />} />
            <Route path="ai-chat-bots" element={<AIChatBots />} />
            <Route path="ai-imagery" element={<AiImageryForm />} />
            <Route path="fact-check" element={<FactCheck />} />
          </Route>
          <Route path="/resume" element={<Resume />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
      <LinksPanel />
      <Modal />
    </div>
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
