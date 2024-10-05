import './App.css';
import React, { useState, useEffect, useRef } from 'react';

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
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const conversationEndRef = useRef(null);
  const conversationRef = useRef(null);

  const convertNewlinesToBr = (text) => {
    return text.replace(/\n/g, '<br />');
  };

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
            const updatedLinks = [...data.links, ...persistentLinks];
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

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  const adjustConversationHeight = () => {
    const headerHeight = document.querySelector('.navbar').offsetHeight;
    const footerHeight = document.querySelector('.footer').offsetHeight;
    const inputHeight = document.querySelector('.input-container').offsetHeight;

    const availableHeight = window.innerHeight - headerHeight - inputHeight - footerHeight;
    if (conversationRef.current) {
      conversationRef.current.style.height = `${availableHeight + 5}px`;
    }
  };

  useEffect(() => {
    adjustConversationHeight();
    window.addEventListener('resize', adjustConversationHeight);

    return () => {
      window.removeEventListener('resize', adjustConversationHeight);
    };
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Function to reset the conversation and links
  const handleReset = () => {
    setConversation([]);
    setPersistentLinks([]);
    setThreadId(null);
    setNewLinks([]);

    localStorage.removeItem('conversation');
    localStorage.removeItem('persistentLinks');
    localStorage.removeItem('threadId');
  };

  return (
    <div className="background">
      <div className="App">
        {/* Fixed Navbar */}
        <div className="navbar">
          <h1>Rabin Forest</h1>
          <p className="subheader">AI Personal Assistant<br />for Brian Foster</p>
          <button className="toggle-panel-btn" onClick={togglePanel}>
            Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
          </button>
        </div>

        {/* Slide-out Panel */}
        <div className={`slideout-panel ${isPanelOpen ? 'open' : ''}`}>
          <div>
            <h2>Links</h2>
            <hr />
            {persistentLinks.length > 0 ? (
              <div>
                {persistentLinks.map((link, index) => (
                  <p key={index}>
                    <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                  </p>
                ))}
              </div>
            ) : (
              <p>No links available</p>
            )}
            <hr />
            <button className="toggle-panel-btn" onClick={togglePanel}>
              Close
            </button>
          </div>
        </div>

        {/* Conversation */}
        <div className="conversation" ref={conversationRef}>
          {conversation.map((msg, index) => (
            <div key={index} className={msg.role === 'user' ? 'user-message' : 'assistant-message'}>
              <div className="message-bubble">
                <p dangerouslySetInnerHTML={{ __html: msg.content }} style={{ margin: 0 }}></p>
              </div>
            </div>
          ))}
          <div ref={conversationEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-container">
          {error && <div className="error">There was an error. Try again.</div>}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows="2"
            placeholder="Type your message..."
          />
          <button onClick={handleSubmit} disabled={loading} className='submit'>
            {loading ? <span>Thinking...</span> : <span>Send</span>}
          </button>
          <button className='reset-button' onClick={handleReset} disabled={loading} >
            Start Over
          </button> {/* New reset button */}
        </div>

        {/* Fixed Footer */}
        <div className="footer">
          <p>© {new Date().getFullYear()} www.rabinforest.com</p>
        </div>
      </div>
    </div>
  );
}

export default App;
