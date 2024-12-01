import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Navbar from './Navbar';
import InputArea from './InputAreaSection';
import Footer from './Footer';
import Conversation from './Conversation';
import SlideOutPanel from './SlideOutPanel';
import SplashScreen from './SplashScreen';
import Menu from './Menu';
import Playground from './Playground';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { fetchAssistantResponse, resetAssistantState } from './features/assistantSlice';

function App() {
  const dispatch = useDispatch();
  const {
    conversation,
    persistentLinks,
    newLinks,
    threadId,
    loading,
    error,
  } = useSelector((state) => state.assistant);

  const [inputText, setInputText] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768);
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOutSplash, setFadeOutSplash] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const conversationEndRef = useRef(null);
  const [showApp, setShowApp] = useState(false); // State to show the app after splash screen


  useEffect(() => {
    //setShowSplash(true);
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
    if (inputText) {
      dispatch(fetchAssistantResponse({ inputText, threadId }));
      setInputText('');
    }
  };

  const handleReset = () => {
    dispatch(resetAssistantState());
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Router>
      <div className={`background ${showApp ? 'show' : ''}`}>
        {showSplash && (
          <div className={`splash-screen ${fadeOutSplash ? 'fade-out' : ''}`}>
            <SplashScreen />
          </div>
        )}
        <>
          <Navbar
            togglePanel={() => setIsPanelOpen(!isPanelOpen)}
            toggleMenu={() => setIsMenuOpen(!isMenuOpen)}
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
            <Route
              path="/"
              element={
                <div className={`App ${isPanelOpen ? 'open' : ''}`}>
                  <Conversation conversation={conversation} conversationEndRef={conversationEndRef} />
                  <InputArea
                    isPanelOpen={isPanelOpen}
                    inputText={inputText}
                    setInputText={setInputText}
                    handleSubmit={handleSubmit}
                    handleReset={handleReset}
                    handleKeyDown={handleKeyDown}
                    loading={loading}
                    error={error}
                  />
                </div>
              }
            />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </>
        <Footer isPanelOpen={isPanelOpen}></Footer>
      </div>
    </Router>
  );
}

export default App;