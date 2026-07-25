import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('O elemento raiz do Crypt não foi encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
