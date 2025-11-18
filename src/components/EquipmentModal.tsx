import React, { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase, supabaseAdmin } from '../services/supabaseClient';
import type { Equipment, Company } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { getManufacturers, getModelsByManufacturer } from '../data/equipmentCatalog';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companies: Company[];
    initialEquipment?: Equipment | null;
    onSaved?: (equipment: Equipment) => void;
}

export const EquipmentModal: React.FC<Props> = ({ isOpen, onClose, companies, initialEquipment = null, onSaved }) => {
    const { profile } = useAuth();
    const [formData, setFormData] = useState({
        company_id: initialEquipment?.company_id || '',
        manufacturer: initialEquipment?.manufacturer || '',
        model: initialEquipment?.model || '',
        serial_number: initialEquipment?.serial_number || '',
        internal_location: initialEquipment?.internal_location || '',
        installation_location: initialEquipment?.installation_location || '',
        application_type: (initialEquipment?.application_type as 'Acesso' | 'Ponto' | '') || '',
        tecnology: initialEquipment?.tecnology || ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [useCustomManufacturer, setUseCustomManufacturer] = useState(false);
    const [useCustomModel, setUseCustomModel] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        setFormData({
            company_id: initialEquipment?.company_id || '',
            manufacturer: initialEquipment?.manufacturer || '',
            model: initialEquipment?.model || '',
            serial_number: initialEquipment?.serial_number || '',
            internal_location: initialEquipment?.internal_location || '',
            installation_location: initialEquipment?.installation_location || '',
            application_type: (initialEquipment?.application_type as 'Acesso' | 'Ponto' | '') || '',
            tecnology: initialEquipment?.tecnology || ''
        });

        // Setup manufacturer/model suggestions
        const manufacturers = getManufacturers();
        const isCustomManufacturer = initialEquipment ? !manufacturers.includes(initialEquipment.manufacturer) : false;
        setUseCustomManufacturer(isCustomManufacturer);
        if (!isCustomManufacturer && initialEquipment) {
            const models = getModelsByManufacturer(initialEquipment.manufacturer);
            setAvailableModels(models);
            setUseCustomModel(!models.includes(initialEquipment.model));
        } else {
            setAvailableModels([]);
            setUseCustomModel(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialEquipment]);

    if (!isOpen) return null;

    const handleManufacturerChange = (value: string) => {
        setFormData({ ...formData, manufacturer: value, model: '' });
        if (value === 'custom') {
            setUseCustomManufacturer(true);
            setAvailableModels([]);
            setFormData({ ...formData, manufacturer: '', model: '' });
        } else {
            setUseCustomManufacturer(false);
            const models = getModelsByManufacturer(value);
            setAvailableModels(models);
            setUseCustomModel(false);
        }
    };

    const handleModelChange = (value: string) => {
        if (value === 'custom') {
            setUseCustomModel(true);
            setFormData({ ...formData, model: '' });
        } else {
            setUseCustomModel(false);
            setFormData({ ...formData, model: value });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const client = (profile?.role === 'admin' || profile?.role === 'tecnico') && supabaseAdmin
            ? supabaseAdmin
            : supabase;

        try {
            if (initialEquipment) {
                const { data, error } = await client
                    .from('equipments')
                    .update({
                        company_id: formData.company_id,
                        manufacturer: formData.manufacturer,
                        model: formData.model,
                        serial_number: formData.serial_number || null,
                        internal_location: formData.internal_location || null,
                        installation_location: formData.installation_location || null,
                        application_type: formData.application_type || null,
                        tecnology: formData.tecnology || null
                    })
                    .eq('id', initialEquipment.id)
                    .select()
                    .single();

                if (error) throw error;
                onSaved && onSaved(data as Equipment);
                onClose();
            } else {
                const { data, error } = await client
                    .from('equipments')
                    .insert({
                        company_id: formData.company_id,
                        manufacturer: formData.manufacturer,
                        model: formData.model,
                        serial_number: formData.serial_number || null,
                        internal_location: formData.internal_location || null,
                        installation_location: formData.installation_location || null,
                        application_type: formData.application_type || null,
                        tecnology: formData.tecnology || null
                    })
                    .select()
                    .single();

                if (error) throw error;
                onSaved && onSaved(data as Equipment);
                onClose();
            }
        } catch (error) {
            console.error('Erro ao salvar equipamento:', error);
            alert('Erro ao salvar equipamento. Veja o console para detalhes.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {initialEquipment ? 'Editar Equipamento' : 'Novo Equipamento'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Fechar modal">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Select
                            label="Empresa *"
                            value={formData.company_id}
                            onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                            required
                        >
                            <option value="">Selecione uma empresa</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </Select>

                        <div className="space-y-2">
                            {!useCustomManufacturer ? (
                                <>
                                    <Select
                                        label="Fabricante *"
                                        value={formData.manufacturer}
                                        onChange={(e) => handleManufacturerChange(e.target.value)}
                                        required
                                    >
                                        <option value="">Selecione um fabricante</option>
                                        {getManufacturers().map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                        <option value="custom">➕ Outro (digitar manualmente)</option>
                                    </Select>
                                </>
                            ) : (
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Input
                                            label="Fabricante *"
                                            value={formData.manufacturer}
                                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                            placeholder="Digite o nome do fabricante"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        title="Voltar para lista de fabricantes"
                                        onClick={() => {
                                            setUseCustomManufacturer(false);
                                            setFormData({ ...formData, manufacturer: '', model: '' });
                                            setAvailableModels([]);
                                        }}
                                        className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
                                    >
                                        Lista
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            {!useCustomModel && availableModels.length > 0 ? (
                                <Select
                                    label="Modelo *"
                                    value={formData.model}
                                    onChange={(e) => handleModelChange(e.target.value)}
                                    required
                                    disabled={!formData.manufacturer}
                                >
                                    <option value="">Selecione um modelo</option>
                                    {availableModels.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                    <option value="custom">➕ Outro (digitar manualmente)</option>
                                </Select>
                            ) : (
                                <div className="flex items-end gap-2">
                                    <div className="flex-1">
                                        <Input
                                            label="Modelo *"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                            placeholder="Digite o modelo do equipamento"
                                            required
                                            disabled={!formData.manufacturer}
                                        />
                                    </div>
                                    {availableModels.length > 0 && (
                                        <button
                                            type="button"
                                            title="Voltar para lista de modelos"
                                            onClick={() => { setUseCustomModel(false); setFormData({ ...formData, model: '' }); }}
                                            className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
                                        >
                                            Lista
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <Input label="Número de Série" value={formData.serial_number} onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })} />

                        <Select label="Tipo de Aplicação" value={formData.application_type} onChange={(e) => setFormData({ ...formData, application_type: e.target.value as 'Acesso' | 'Ponto' | '' })}>
                            <option value="">Selecione</option>
                            <option value="Acesso">Acesso</option>
                            <option value="Ponto">Ponto</option>
                        </Select>

                        <Input label="Tecnologia" value={formData.tecnology} onChange={(e) => setFormData({ ...formData, tecnology: e.target.value })} placeholder="Ex: Biometria, Proximidade, etc." />

                        <Input label="Localização Interna" value={formData.internal_location} onChange={(e) => setFormData({ ...formData, internal_location: e.target.value })} placeholder="Ex: Portaria Principal" />

                        <Input label="Local de Instalação" value={formData.installation_location} onChange={(e) => setFormData({ ...formData, installation_location: e.target.value })} placeholder="Ex: Próximo à recepção" />

                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>) : (initialEquipment ? 'Atualizar' : 'Adicionar')}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EquipmentModal;
