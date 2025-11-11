import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
};

export const Textarea: React.FC<TextareaProps> = ({ id, label, minLength, value, ...props }) => {
    const charCount = (value as string || '').length;
    const showWarning = minLength && charCount > 0 && charCount < minLength;
    const showSuccess = minLength && charCount >= minLength;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
                {label}
            </label>
            <textarea
                id={id}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={value}
                {...props}
            />
            {minLength && (
                <p className={`text-xs mt-1 ${showWarning ? 'text-red-500' : showSuccess ? 'text-green-600' : 'text-gray-500'}`}>
                    {charCount} / {minLength} caracteres mínimos
                </p>
            )}
        </div>
    );
}