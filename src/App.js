import './App.css';
import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState([]); // Store the conversation history (for display only)
  const [newLinks, setNewLinks] = useState([]); // Store the new links from the current response
  const [persistentLinks, setPersistentLinks] = useState([]); // Persistent array for the slide-out panel
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [threadId, setThreadId] = useState(sessionStorage.getItem('threadId') || null); // Store the thread ID
  const [isPanelOpen, setIsPanelOpen] = useState(false); // State for slide-out panel
  const conversationEndRef = useRef(null); // Ref to scroll to the bottom of the conversation
  const conversationRef = useRef(null); // Ref to the conversation div for resizing

  const convertNewlinesToBr = (text) => {
    return text.replace(/\n/g, '<br />');
  };

  const handleSubmit = async () => {
    if (inputText !== '') {
      let currentPrompt = inputText;
      setInputText('');  // Clear the input field
      setLoading(true);  // Show the spinner
      setError(false);  // Reset the error state
      setNewLinks([]); // Reset new links count for the badge

      const updatedConversation = [...conversation, { role: 'user', content: currentPrompt }];
      setConversation(updatedConversation);

      try {
        const res = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: currentPrompt, // Send only the new user prompt
            threadId: threadId // Send the existing threadId, if any
          }),
        });

        let data = await res.json();
        console.log('data:', data);

        if (data.threadId) {
          setThreadId(data.threadId);
          sessionStorage.setItem('threadId', data.threadId); // Persist the threadId
        }

        if (data.answer) {
          let parsedAnswer = data.answer;

          try {
            const parsedObject = JSON.parse(data.answer);
            parsedAnswer = parsedObject.answer;
          } catch (e) {
            console.log('Failed to parse JSON, treating as a regular string.');
          }

          setConversation(prev => [...prev, { role: 'assistant', content: convertNewlinesToBr(parsedAnswer) }]);

          if (data.links && data.links.length > 0) {
            // Add new links to persistent link storage
            setPersistentLinks(prevLinks => [...data.links, ...prevLinks]);
            setNewLinks(data.links); // Display new links for the badge
          }

          setInputText('');
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
        setLoading(false);  // Hide the spinner
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

  // Function to toggle the slide-out panel
  const togglePanel = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  return (
    <div className="App">
      {/* Fixed Navbar */}
      <div className="navbar">
        <h1>Rabin Forest</h1>
        <button className="toggle-panel-btn" onClick={togglePanel}>
          Links {newLinks.length > 0 && <span className="badge">{newLinks.length}</span>}
        </button>
      </div>

      {/* Slide-out Panel */}
      <div className={`slideout-panel ${isPanelOpen ? 'open' : ''}`}>
        <div>
          <h2>Links</h2>
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
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? <span>Thinking...</span> : <span>Send</span>}
        </button>
      </div>

      {/* Fixed Footer */}
      <div className="footer">
        <p>© 2024 www.rabinforest.com</p>
      </div>
    </div>
  );
}

export default App;
