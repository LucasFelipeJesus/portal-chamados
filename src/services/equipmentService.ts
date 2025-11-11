// Serviço para consultar equipamentos vinculados a empresas
import { supabase } from './supabaseClient';

export interface Equipment {
    id: string;
    company_id: string;
    manufacturer: string;
    model: string;
    serial_number?: string;
    installation_location?: string;
    created_at: string;
}

// Busca todos os equipamentos de uma empresa
export const getCompanyEquipments = async (companyId: string) => {
    const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar equipamentos:', error);
        return { data: null, error };
    }

    return { data: data as Equipment[], error: null };
};

// Busca empresa por CNPJ
export const getCompanyByCNPJ = async (cnpj: string) => {
    // Remove caracteres não numéricos do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');

    const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('cnpj', cleanCNPJ)
        .single();

    if (error) {
        console.error('Erro ao buscar empresa:', error);
        return { data: null, error };
    }

    return { data, error: null };
};

// Cadastra um novo equipamento
export const createEquipment = async (equipment: Omit<Equipment, 'id' | 'created_at'>) => {
    const { data, error } = await supabase
        .from('equipments')
        .insert([equipment])
        .select()
        .single();

    if (error) {
        console.error('Erro ao cadastrar equipamento:', error);
        return { data: null, error };
    }

    return { data: data as Equipment, error: null };
};
