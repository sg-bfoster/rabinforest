import './App.css';
import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [conversation, setConversation] = useState([]); // Store the conversation history (for display only)
  const [links, setLinks] = useState([]); // Store the links
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [threadId, setThreadId] = useState(sessionStorage.getItem('threadId') || null); // Store the thread ID
  const conversationEndRef = useRef(null); // Ref to scroll to the bottom of the conversation

  // Function to convert newlines to <br /> tags
  const convertNewlinesToBr = (text) => {
    return text.replace(/\n/g, '<br />');
  };

  const handleSubmit = async () => {
    if (inputText !== '') {
      let currentPrompt = inputText;
      setInputText('');  // Clear the input field
      setLoading(true);  // Show the spinner
      setError(false);  // Reset the error state

      // Add user's input to the conversation (for display)
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

        // Save the threadId if it's returned (for first request)
        if (data.threadId) {
          setThreadId(data.threadId);
          sessionStorage.setItem('threadId', data.threadId); // Persist the threadId
        }

        if (data.answer) {
          let parsedAnswer = data.answer;

          // Parse the answer JSON string to extract the content
          try {
            const parsedObject = JSON.parse(data.answer);
            parsedAnswer = parsedObject.answer;
          } catch (e) {
            console.log('Failed to parse JSON, treating as a regular string.');
          }

          // Add AI's response to the conversation (for display)
          setConversation(prev => [...prev, { role: 'assistant', content: convertNewlinesToBr(parsedAnswer) }]);
          setLinks(data.links || []); // Update links if present
          setInputText('');
        } else {
          setError(true);
          setConversation(prev => [...prev, { role: 'assistant', content: "An unexpected error occurred." }]);
          setLinks([]); // Clear links on error
          setInputText(currentPrompt);
        }

      } catch (error) {
        console.log('Error:', error);
        setError(true);
        setConversation(prev => [...prev, { role: 'assistant', content: "An error occurred. Please try again." }]);
        setLinks([]); // Clear links on error
        setInputText(currentPrompt);
      } finally {
        setLoading(false);  // Hide the spinner
      }
    }
  };

  // Scroll to the bottom of the conversation when a new message is added
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  useEffect(() => {
    const handleResize = () => {
      const appElement = document.querySelector('.App');
      const vh = window.innerHeight * 0.01;
      appElement.style.setProperty('--vh', `${vh}px`);
    };

    handleResize(); // Set on initial load
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle key presses in the textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevents adding a new line
      handleSubmit(); // Submit the form
    }
  };

  return (
    <div className="App">
      {/* Fixed Navbar */}
      <div className="navbar">
        <h1>Rabin Forest</h1>
      </div>

      {/* Conversation */}
      <div className="conversation">
        {conversation.map((msg, index) => (
          <div key={index} className={msg.role === 'user' ? 'user-message' : 'assistant-message'}>
            <div className="message-bubble">
              <p dangerouslySetInnerHTML={{ __html: msg.content }} style={{ margin: 0 }}></p>
            </div>
          </div>
        ))}
        <div ref={conversationEndRef} />
      </div>

      {/* Links Section */}
      <div className="links-container">
        {links.length > 0 && (
          <div>
            <h3>Links:</h3>
              {links.map((link, index) => (
                <p key={index}>
                  <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                </p>
              ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="input-container">
        {error && <div className="error">There was an error. Try again.</div>}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown} // Use onKeyDown for detecting Enter and Shift+Enter
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
