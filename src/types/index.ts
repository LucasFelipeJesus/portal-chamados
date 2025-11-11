// src/types/index.ts
import type { User } from '@supabase/supabase-js';

export type UUID = string;

export interface Company {
    id: UUID;
    name: string;
    cnpj: string;
    full_address?: string;
}

export interface Equipment {
    id: UUID;
    company_id: UUID;
    manufacturer: string;
    model: string;
    serial_number?: string;
    internal_location?: string;
    installation_location?: string;
    application_type?: 'Acesso' | 'Ponto';
    tecnology?: string;
    created_at: string;
}

export interface UserProfile {
    id: UUID;
    full_name: string;
    email: string;
    phone?: string;
    role: 'cliente' | 'tecnico' | 'admin';
    company_id: UUID;
    company?: Company; // Opcional, se fizermos join
    additional_company_ids?: UUID[];
    companies?: Company[]; // Principal + adicionais
    force_password_change?: boolean;
}

// O formulário de 10 campos
export interface TicketFormData {
    // 1
    manufacturer: string;
    model: string;
    // 2
    application_type: 'Acesso' | 'Ponto' | '';
    // 3
    problem_description: string;
    // 4
    card_type: 'Smartcard' | 'Proximidade HID' | 'Biometria' | 'Facial' | '';
    // 5
    previous_procedures: string;
    // 6
    address_cep: string;
    full_address: string;
    // 7
    internal_location: string;
    // 8
    integration_needed: boolean;
    integration_requirements: string;
    // 9
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    // 10 (Derivado do usuário)
    company_cnpj: string;
}

export type TicketStatus = 'aberto' | 'em_atendimento' | 'aguardando_cliente' | 'fechado' | 'cancelado';

export interface Ticket {
    id: number;
    created_at: string;
    client_id: UUID;
    company_id: UUID;
    status: TicketStatus;
    equipment_manufacturer: string;
    equipment_model: string;
    application_type: 'Acesso' | 'Ponto';
    internal_location: string;
    form_data: TicketFormData;
    closed_at?: string;
    company?: Company; // Opcional - Join com companies
    client?: UserProfile; // Opcional - Join com user_profiles (usuário que abriu)
}

// Contexto de Autenticação
export interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, pass: string) => Promise<string | null>;
    signOut: () => void;
    refreshProfile: () => Promise<void>;
}

// Simulação de roteamento
export type Page = 'dashboard' | 'new-ticket' | 'ticket-detail' | 'reports' | 'companies' | 'users' | 'profile' | 'admin' | 'settings';