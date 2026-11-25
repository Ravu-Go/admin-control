import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-700.css';
import './app/i18n';
import './design/tokens.css';
import './design/styles.css';
import { App } from './app/App';
import { StaffSessionProvider } from './app/StaffSession';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 }, mutations: { retry: false } } });
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><StaffSessionProvider><App/></StaffSessionProvider></BrowserRouter></QueryClientProvider></React.StrictMode>);
