import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; // Import Provider
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import store from './store'; // Import your Redux store

if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('10.0.0')) {
  window.location.href = `https://${window.location.host}${window.location.pathname}${window.location.search}`;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}> {/* Wrap App with Provider */}
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
