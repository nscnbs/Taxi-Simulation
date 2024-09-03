import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';  // Sprawdź poprawność ścieżki
import reportWebVitals from './reportWebVitals'; // Sprawdź poprawność ścieżki
import 'bootstrap/dist/css/bootstrap.min.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement as HTMLElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

reportWebVitals(console.log);
