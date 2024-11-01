import './App.css';
import React, { useState, useRef, useEffect } from 'react';
import Navbar from './Navbar';
import InputArea from './InputAreaSection';
import Footer from './Footer';
import Conversation from './Conversation';
import SlideOutPanel from './SlideOutPanel';
import SplashScreen from './SplashScreen'; // Import the splash screen
import Menu from './Menu'; // Import the new Menu component
import Playground from './Playground'; // Import the new Profile page component
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import React Router


function App() {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState(() => {
    const savedConversation = localStorage.getItem('conversation');
    return savedConversation ? JSON.parse(savedConversation) : [];
  });
  const [newLinks, setNewLinks] = useState([]);
  const [persistentLinks, setPersistentLinks] = useState(() => {
    const savedLinks = localStorage.getItem('persistentLinks');
    return savedLinks ? JSON.parse(savedLinks) : [];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [threadId, setThreadId] = useState(localStorage.getItem('threadId') || null);
  const [isPanelOpen, setIsPanelOpen] = useState(window.innerWidth >= 768); // Default to open on wider screens
  const [showSplash, setShowSplash] = useState(true); // State for splash screen
  const [fadeOutSplash, setFadeOutSplash] = useState(false); // State to trigger fade out
  const [showApp, setShowApp] = useState(false); // State to show the app after splash screen
  const conversationEndRef = useRef(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // New state for menu panel

  const convertNewlinesToBr = (text) => {
    return text.replace(/\n/g, '<br />');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen); // Toggle the menu panel
  };

  useEffect(() => {
    // Trigger fade-out effect after 3 seconds
    setShowApp(true);
    const splashTimeout = setTimeout(() => {
      setFadeOutSplash(true);
      // Remove the splash screen from the DOM after the fade-out finishes
      setTimeout(() => setShowSplash(false), 1000); // Match this to the CSS transition duration
    }, 2000);

    return () => clearTimeout(splashTimeout);
  }, []);

  // Automatically toggle panel based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsPanelOpen(true);  // Always open on desktop screens
        setIsDesktop(true);
      } else {
        setIsPanelOpen(false); // Always closed on smaller screens
        setIsDesktop(false);
      }
    };

    window.addEventListener('resize', handleResize);

    // Call once to set the initial state based on window width
    handleResize();

    // Clean up the event listener on unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSubmit = async () => {
    if (inputText !== '') {
      let currentPrompt = inputText;
      setInputText('');
      setLoading(true);
      setError(false);
      setNewLinks([]);

      const updatedConversation = [...conversation, { role: 'user', content: currentPrompt }];
      setConversation(updatedConversation);
      localStorage.setItem('conversation', JSON.stringify(updatedConversation));

      try {
        const res = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: currentPrompt,
            threadId: threadId,
          }),
        });

        let data = await res.json();

        if (data.threadId) {
          setThreadId(data.threadId);
          localStorage.setItem('threadId', data.threadId);
        }

        if (data.answer) {
          let parsedAnswer = data.answer;

          try {
            const parsedObject = JSON.parse(data.answer);
            parsedAnswer = parsedObject.answer;
          } catch (e) {
            console.log('Failed to parse JSON, treating as a regular string.');
          }

          const updatedAssistantConversation = [...updatedConversation, { role: 'assistant', content: convertNewlinesToBr(parsedAnswer) }];
          setConversation(updatedAssistantConversation);
          localStorage.setItem('conversation', JSON.stringify(updatedAssistantConversation));

          if (data.links && data.links.length > 0) {
            const updatedLinks = Array.from(new Set([...data.links, ...persistentLinks]));
            setPersistentLinks(updatedLinks);
            setNewLinks(data.links);
            localStorage.setItem('persistentLinks', JSON.stringify(updatedLinks));
          }
        } else {
          setError(true);
          setConversation(prev => [...prev, { role: 'assistant', content: "An unexpected error occurred." }]);
          setInputText(currentPrompt);
        }
      } catch (error) {
        console.log('Error:', error);
        setError(true);
        setConversation(prev => [...prev, { role: 'assistant', content: "An error occurred. Please try again." }]);
        setInputText(currentPrompt);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  const handleReset = () => {
    setConversation([]);
    setPersistentLinks([]);
    setThreadId(null);
    setNewLinks([]);
    localStorage.removeItem('conversation');
    localStorage.removeItem('persistentLinks');
    localStorage.removeItem('threadId');
    window.location.reload();
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
          <Navbar togglePanel={togglePanel} toggleMenu={toggleMenu} newLinks={newLinks} isDesktop={isDesktop} isPanelOpen={isPanelOpen} />
          <Menu isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} />
          <SlideOutPanel
              isPanelOpen={isPanelOpen}
              togglePanel={togglePanel}
              persistentLinks={persistentLinks}
              isDesktop={isDesktop} 
            />
          {/* Render the overlay only if the panel is open and it's not a desktop */}
          {!isDesktop && (isPanelOpen || isMenuOpen) && (
            <div className="overlay-mask show" onClick={() => {
              if (isPanelOpen) togglePanel();
              if (isMenuOpen) toggleMenu();
            }}>
              <div className="overlay-content"></div>
            </div>
          )}

          {/* Define Routes Here */}
          <Routes>
            <Route path="/" element={
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
            } />
            
            {/* New Route for the Profile Page */}
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </>
        <Footer isPanelOpen={isPanelOpen}></Footer>
      </div>
    </Router>
  );
}

export default App;