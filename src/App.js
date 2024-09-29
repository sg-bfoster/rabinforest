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
      setLoading(true);  // Show the spinner
      setError(false);  // Reset the error state

      // Add user's input to the conversation (for display)
      const updatedConversation = [...conversation, { role: 'user', content: inputText }];
      setConversation(updatedConversation);

      try {
        const res = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: inputText, // Send only the new user prompt
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
        } else {
          setError(true);
          setConversation(prev => [...prev, { role: 'assistant', content: "An unexpected error occurred." }]);
          setLinks([]); // Clear links on error
        }

      } catch (error) {
        console.log('Error:', error);
        setError(true);
        setConversation(prev => [...prev, { role: 'assistant', content: "An error occurred. Please try again." }]);
        setLinks([]); // Clear links on error
      } finally {
        setLoading(false);  // Hide the spinner
        setInputText('');  // Clear input field
      }
    }
  };

  // Scroll to the bottom of the conversation when a new message is added
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  return (
    <div className="App">
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

      <div className="input-container">
        {error && <div className="error">There was an error. Try again.</div>}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows="2"
          placeholder="Type your message..."
          onKeyPress={(e) => e.key === 'Enter' ? handleSubmit() : null}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? <span>Thinking...</span> : <span>Send</span>}
        </button>
      </div>
    </div>
  );
}

export default App;
