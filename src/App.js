import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './Navbar';
import Footer from './Footer';
import SlideOutPanel from './SlideOutPanel';
import SplashScreen from './SplashScreen';
import Menu from './Menu';
import Playground from './Playground';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { fetchAssistantResponse, resetAssistantState } from './features/assistantSlice';
import Modal from './Modal';
import Home from './Home';
import EmmaSplashPage from './EmmaSplashPage';

// Helper component to access location
const AppContent = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const {
    conversation,
    persistentLinks,
    newLinks,
    threadId,
  } = useSelector((state) => state.assistant);

  // Keep a local copy of conversation for immediate user message display
  const [localConversation, setLocalConversation] = useState(conversation);
  const [isEmmaReferrer, setIsEmmaReferrer] = useState(false);

  useEffect(() => {
    // Check if the referrer is emmajanefoster.net
    const referrer = document.referrer;
    
    // Check for URL parameter for testing
    const urlParams = new URLSearchParams(location.search);
    const isTestMode = urlParams.get('emma') === 'true';
    
    // More robust check for emmajanefoster.net domain
    const isEmmaDomain = referrer.includes('emmajanefoster.net') || 
                         referrer.includes('www.emmajanefoster.net') ||
                         referrer.includes('https://emmajanefoster.net') ||
                         referrer.includes('http://emmajanefoster.net');
    
    console.log('Referrer:', referrer);
    console.log('Is Emma referrer:', isEmmaDomain || isTestMode);
    
    setIsEmmaReferrer(isEmmaDomain || isTestMode);
  }, [location]);

  useEffect(() => {
    // Sync localConversation whenever Redux conversation updates
    setLocalConversation(conversation);
  }, [conversation]);

  const [inputText, setInputText] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOutSplash, setFadeOutSplash] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const conversationEndRef = useRef(null);
  const [showApp, setShowApp] = useState(false);

  useEffect(() => {
    setShowApp(true);
    const splashTimeout = setTimeout(() => {
      setFadeOutSplash(true);
      setTimeout(() => setShowSplash(false), 1000);
    }, 2000);

    return () => clearTimeout(splashTimeout);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsPanelOpen(true);
        setIsDesktop(true);
      } else {
        setIsPanelOpen(false);
        setIsDesktop(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = () => {
    if (inputText.trim()) {
      setLocalConversation(prev => [...prev, { role: 'user', content: inputText.trim() }]);
      dispatch(fetchAssistantResponse({ inputText: inputText.trim(), threadId }));
      setInputText('');
    }
  };

  // If the user came from emmajanefoster.net, show only the Emma splash page
  if (isEmmaReferrer) {
    return <EmmaSplashPage />;
  }

  return (
    <div className={`background ${showApp ? 'show' : ''}`}>
      {showSplash && (
        <div className={`splash-screen ${fadeOutSplash ? 'fade-out' : ''}`}>
          <SplashScreen />
        </div>
      )}
      <>
        <Navbar
          togglePanel={() => {
            setIsPanelOpen(!isPanelOpen);
            setIsMenuOpen(false);
          }}
          toggleMenu={() => {
            setIsMenuOpen(!isMenuOpen);
            setIsPanelOpen(false);
          }}
          newLinks={newLinks}
          isDesktop={isDesktop}
          isPanelOpen={isPanelOpen}
        />
        <Menu
          isMenuOpen={isMenuOpen}
          isDesktop={isDesktop}
          setIsPanelOpen={setIsPanelOpen}
          setIsDesktop={setIsDesktop}
          toggleMenu={() => setIsMenuOpen(!isMenuOpen)}
        />
        <SlideOutPanel
          isPanelOpen={isPanelOpen}
          togglePanel={() => setIsPanelOpen(!isPanelOpen)}
          persistentLinks={persistentLinks}
          isDesktop={isDesktop}
        />
        {!isDesktop && (isPanelOpen || isMenuOpen) && (
          <div
            className="overlay-mask show"
            onClick={() => {
              if (isPanelOpen) setIsPanelOpen(false);
              if (isMenuOpen) setIsMenuOpen(false);
            }}
          >
            <div className="overlay-content"></div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/playground" element={<Playground />} />
        </Routes>
      </>
      <Footer isPanelOpen={isPanelOpen}></Footer>
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
