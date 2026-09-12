// Contact.js — same shape as AskGWINnett / Lost Corridors feedback:
// required message, optional name and email, mailer on the services dyno.
import React, { useState } from 'react';
import { API_ENDPOINTS } from './config/api';
import { Hero, ScreenBody } from './components/Hero';
import { version } from '../package.json';

const Contact = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim().length < 2 || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch(API_ENDPOINTS.CONTACT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
          version,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.ok) {
        setStatus('sent');
        setName('');
        setEmail('');
        setMessage('');
        return;
      }
      setErrorMsg(data.error || 'Couldn’t send right now. Please try again in a few minutes.');
      setStatus('error');
    } catch {
      setErrorMsg('Couldn’t send right now. Please try again in a few minutes.');
      setStatus('error');
    }
  };

  return (
    <>
      <Hero>
        <h1 className="hero-h1">Get in touch.</h1>
        <p className="hero-sub hero-sub--page">
          A comment, a question, or a reason to talk. Name and email are optional —
          leave them if you want a reply.
        </p>
      </Hero>
      <ScreenBody width="page">
        <div className="panel contact-panel">
          {status === 'sent' ? (
            <p className="contact-thanks">Thanks — your message was sent.</p>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="contact-name">Name (optional)</label>
                <input
                  id="contact-name"
                  className="input"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  value={name}
                  disabled={status === 'sending'}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="contact-email">Email (optional — only if you’d like a reply)</label>
                <input
                  id="contact-email"
                  className="input"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  disabled={status === 'sending'}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="contact-message">Comment or question</label>
                <textarea
                  id="contact-message"
                  className="input"
                  rows="6"
                  required
                  maxLength={4000}
                  value={message}
                  disabled={status === 'sending'}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What’s on your mind?"
                />
              </div>
              {status === 'error' && <p className="error-message">{errorMsg}</p>}
              <div className="contact-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={status === 'sending' || message.trim().length < 2}
                >
                  {status === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </ScreenBody>
    </>
  );
};

export default Contact;
