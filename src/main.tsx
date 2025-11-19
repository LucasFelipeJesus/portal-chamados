
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css'; // Seu arquivo CSS principal (ex: Tailwind)
import './utils/debugTools'; // Ferramentas de debug disponíveis no console
import './utils/supabaseDebug'; // Debug do Supabase

const basename = (import.meta as any)?.env?.BASE_URL || '/';

ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter basename={basename}>
        <AuthProvider>
            <App />
        </AuthProvider>
    </BrowserRouter>
);