
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css'; // Seu arquivo CSS principal (ex: Tailwind)
import './utils/debugTools'; // Ferramentas de debug disponíveis no console
import './utils/supabaseDebug'; // Debug do Supabase

ReactDOM.createRoot(document.getElementById('root')!).render(
    <AuthProvider>
        <App />
    </AuthProvider>
);