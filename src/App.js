import './App.css';
import React, { useState } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState({ answer: '', links: [] });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);  // Show the spinner
    try {
      const res = await fetch('https://bfoster-services.herokuapp.com/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: inputText }),
      });

      const data = await res.json();
      setResponse(data);  // Assuming 'answer' is the key in the JSON response
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);  // Hide the spinner
    }
  };

  return (
    <div className="App">
      <br />
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
        {loading && <span className="spinner">Loading...</span>}
      </button>
      
      <div style={{ maxWidth: '300px', margin: 'auto', textAlign: 'left' }}>
        <h3>Response:</h3>
        <p>{response.answer}</p>
        <h3>Links:</h3>
        {response.links.map((item, index) => (
          <p key={index}>
            <a target="_blank" rel="noopener noreferrer" href={item}>{item}</a>
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;
