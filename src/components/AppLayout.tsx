import React, { useState, useEffect } from 'react';
import { ShieldCheck, LogIn, BarChart3, Building2, Users as UsersIcon, UserCircle, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabaseClient';
import type { Page } from '../types';
import { DashboardPage } from '../pages/Dashboard';
import { TicketDetailPage } from '../pages/TicketDetail';
import { ReportsPage } from '../pages/Reports';
import { NewTicketPage } from '../pages/NewTicket';
import { CompanyManagementPage } from '../pages/CompanyManagement';
import { UserManagementPage } from '../pages/UserManagement';
import { ProfilePage } from '../pages/Profile';
import { FirstPasswordChangePage } from '../pages/FirstPasswordChange';
import { SystemSettingsPage } from '../pages/SystemSettings';


export const AppLayout: React.FC = () => {
    const { profile, signOut } = useAuth();
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
    const [portalName, setPortalName] = useState('Portal de Chamados');
    const [logoUrl, setLogoUrl] = useState<string | null>(null);

    // Buscar configurações do sistema (apenas uma vez)
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data: settings } = await supabase
                    .from('system_settings')
                    .select('setting_key, setting_value')
                    .in('setting_key', ['portal_name', 'logo_url']);

                if (settings) {
                    const nameConfig = settings.find(s => s.setting_key === 'portal_name');
                    const logoConfig = settings.find(s => s.setting_key === 'logo_url');

                    if (nameConfig?.setting_value) {
                        setPortalName(nameConfig.setting_value);
                    }
                    if (logoConfig?.setting_value) {
                        setLogoUrl(logoConfig.setting_value);
                    }
                }
            } catch (error) {
                console.error('Erro ao buscar configurações do sistema:', error);
            }
        };

        fetchSettings();
    }, []); // Executa apenas uma vez no mount

    // Verificar se precisa trocar senha
    if (profile?.force_password_change) {
        return <FirstPasswordChangePage />;
    }

    const handleViewTicket = (ticketId: number) => {
        setSelectedTicketId(ticketId);
        setPage('ticket-detail');
    };

    const renderPage = () => {
        switch (page) {
            case 'dashboard':
                return <DashboardPage key="dashboard" setPage={setPage} onViewTicket={handleViewTicket} />;
            case 'new-ticket':
                return <NewTicketPage key="new-ticket" setPage={setPage} />;
            case 'ticket-detail':
                return selectedTicketId ? (
                    <TicketDetailPage key={`ticket-${selectedTicketId}`} ticketId={selectedTicketId} setPage={setPage} />
                ) : (
                    <DashboardPage key="dashboard-fallback" setPage={setPage} onViewTicket={handleViewTicket} />
                );
            case 'reports':
                return <ReportsPage key="reports" setPage={setPage} />;
            case 'companies':
                return <CompanyManagementPage key="companies" setPage={setPage} />;
            case 'users':
                return <UserManagementPage key="users" setPage={setPage} />;
            case 'profile':
                return <ProfilePage key="profile" setPage={setPage} />;
            case 'settings':
                return <SystemSettingsPage key="settings" setPage={setPage} />;
            default:
                return <DashboardPage key="dashboard-default" setPage={setPage} onViewTicket={handleViewTicket} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            {logoUrl ? (
                                <img
                                    src={logoUrl}
                                    alt="Logo"
                                    className="h-10 w-auto object-contain"
                                />
                            ) : (
                                <ShieldCheck className="h-8 w-8 text-blue-600" />
                            )}
                            <span className="text-xl font-semibold text-gray-800">{portalName}</span>
                        </div>
                        <div className="flex items-center">
                            {profile?.role === 'admin' && (
                                <>
                                    {page !== 'reports' && (
                                        <button
                                            onClick={() => setPage('reports')}
                                            className="mr-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                            title="Relatórios"
                                        >
                                            <BarChart3 className="h-5 w-5 mr-1" />
                                            Relatórios
                                        </button>
                                    )}
                                    {page !== 'companies' && (
                                        <button
                                            onClick={() => setPage('companies')}
                                            className="mr-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-100 transition-colors"
                                            title="Gerenciar Empresas"
                                        >
                                            <Building2 className="h-5 w-5 mr-1" />
                                            Empresas
                                        </button>
                                    )}
                                    {page !== 'users' && (
                                        <button
                                            onClick={() => setPage('users')}
                                            className="mr-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-gray-100 transition-colors"
                                            title="Gerenciar Usuários"
                                        >
                                            <UsersIcon className="h-5 w-5 mr-1" />
                                            Usuários
                                        </button>
                                    )}
                                    {page !== 'settings' && (
                                        <button
                                            onClick={() => setPage('settings')}
                                            className="mr-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-gray-100 transition-colors"
                                            title="Configurações do Portal"
                                        >
                                            <Settings className="h-5 w-5 mr-1" />
                                            Configurações
                                        </button>
                                    )}
                                </>
                            )}
                            {page !== 'profile' && (
                                <button
                                    onClick={() => setPage('profile')}
                                    className="mr-4 flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-100 transition-colors"
                                    title="Meu Perfil"
                                >
                                    <UserCircle className="h-5 w-5 mr-1" />
                                    Meu Perfil
                                </button>
                            )}
                            <div className="mr-4 text-right">
                                <p className="text-sm font-medium text-gray-800">{profile?.full_name}</p>
                                <p className="text-xs text-gray-500">{profile?.company?.name}</p>
                            </div>
                            <button
                                onClick={signOut}
                                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                title="Sair"
                            >
                                <LogIn className="h-5 w-5 transform -scale-x-100" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main>
                {renderPage()}
            </main>
        </div>
    );
};