import './App.css';
import React, { useState } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState({ answer: '', links: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = async () => {
    if (inputText !== '') {
      setLoading(true);  // Show the spinner
      setError(false);  // Reset the error state
      try {
        const res = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: inputText }),
        });

        // const contentType = res.headers.get('content-type');
        let data = await res.json();

        if (isProperObject(data)) {
          setResponse(data); // Update the response with the object
        } else if (typeof data === 'string') {
          setResponse({ answer: data, links: [] }); // Handle string response
        } else {
          setError(true);  
          setResponse({ answer: "An unexpected error occurred.", links: [] });
        }

      } catch (error) {
        console.error('Error:', error);
        setResponse({ answer: "", links: [] });
        setError(true);  // Show the error message
      } finally {
        setLoading(false);  // Hide the spinner
      }
    }
  };

  function isProperObject(obj) {
    return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
  }  

  // Function to format the answer by replacing newlines with <br/>
  const formatAnswer = (text) => {
    return text.split('\n').join('<br/>');
  };

  return (
    <div className="App">
      <br />
      {error && <div className="error">There was an error. Try again.</div>}
      <textarea
        style={{ width: '300px', margin: 'auto', textAlign: 'left' }}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows="5"
        cols="40"
        placeholder="Ask me anything..."
      />
      <br />
      <button onClick={handleSubmit}>
        {!loading && <span>Submit</span>}
        {loading && <span className="spinner">Thinking...</span>}
      </button>

      <div className={`response ${loading ? 'loading' : ''}`}>
        <h3>Response:</h3>
        <p dangerouslySetInnerHTML={{ __html: formatAnswer(response.answer) }}></p>
        <h3>Links:</h3>
        {response.links && response.links.map((item, index) => (
          <p key={index}>
            <a target="_blank" rel="noopener noreferrer" href={item}>{item}</a>
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
