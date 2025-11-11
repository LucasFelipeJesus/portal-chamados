import React from 'react';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/Login';
import { AppLayout } from './components/AppLayout';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <>
            {!user || !profile ? <LoginPage /> : <AppLayout />}
        </>
    );
};