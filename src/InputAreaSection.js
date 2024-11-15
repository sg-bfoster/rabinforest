// InputArea.js
import React from 'react';

const InputArea = ({
  isPanelOpen,
  inputText,
  setInputText,
  handleSubmit,
  handleReset,
  handleKeyDown,
  loading,
  error
}) => (
  <div className={`input-container ${isPanelOpen ? 'open' : ''}`}>
    {error && <div className="error">There was an error. Try again.</div>}
    <textarea
      value={inputText}
      onChange={(e) => setInputText(e.target.value)}
      onKeyDown={handleKeyDown}
      rows="2"
      placeholder="Ask your question..."
    />
    <button onClick={handleSubmit} disabled={loading} className='submit'>
      {loading ? <span>Thinking...</span> : <span>Ask</span>}
    </button>
    <button className='reset-button' onClick={handleReset}>
      Clear Session
    </button>
  </div>
);

export default InputArea;
