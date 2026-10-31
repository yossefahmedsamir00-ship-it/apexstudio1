import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const root = document.getElementById('flow-engine-root');
if (!root) throw new Error('Flow Engine root element was not found.');
createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
