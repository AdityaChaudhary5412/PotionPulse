import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CurseProvider } from './context/CurseContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CurseProvider>
      <App />
    </CurseProvider>
  </React.StrictMode>
);
