import { createRoot } from 'react-dom/client';
import { App } from './app';

const appEl = document.getElementById('app');

if (!appEl) {
  throw new Error('Could not find #app element');
}

createRoot(appEl).render(<App />);
