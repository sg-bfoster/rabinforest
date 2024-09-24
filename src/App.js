import './App.css';
import React, { useState } from 'react';

function App() {
  const [inputText, setInputText] = useState('');
  const [response, setResponse] = useState({ answer: '', links: [] });

  const handleSubmit = async () => {
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
    }
  };

  return (
    <div className="App">
      <br />
      <textarea
        style={{ width: '400px', margin: 'auto', textAlign: 'left' }}
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        rows="5"
        cols="40"
        placeholder="Ask me anything..."
      />
      <br />
      <button onClick={handleSubmit}>Submit</button>
      <div style={{ maxWidth: '400px', margin: 'auto', textAlign: 'left' }}>
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
