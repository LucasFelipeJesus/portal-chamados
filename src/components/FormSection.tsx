import React from 'react';

interface FormSectionProps {
    title: string;
    number: number;
    children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({ title, number, children }) => (
    <fieldset className="border border-gray-300 rounded-lg p-5 mb-6">
        <legend className="px-2 text-lg font-medium text-gray-800">
            <span className="bg-gray-200 text-blue-700 rounded-full h-8 w-8 flex items-center justify-center font-bold mr-2 shrink-0">{number}</span>
            {title}
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {children}
        </div>
    </fieldset>
);