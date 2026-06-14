import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './services/performance';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
