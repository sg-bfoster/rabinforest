// Conversation.js
import React, { useRef, useEffect } from 'react';

const Conversation = ({ conversation, conversationEndRef }) => {
  const conversationRef = useRef(null);

  // Adjust conversation height
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
    window.addEventListener('resize', adjustConversationHeight);
    adjustConversationHeight();

    return () => {
      window.removeEventListener('resize', adjustConversationHeight);
    };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation, conversationEndRef]);

  return (
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
  );
};

export default Conversation;
