import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    icon?: React.ReactNode;
};

export const Input: React.FC<InputProps> = ({ id, label, icon, ...props }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
        </label>
        <div className="relative">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {React.isValidElement(icon) ? (
                        React.cloneElement(icon as React.ReactElement<any>, { className: `${(icon.props as any)?.className ?? ''} h-5 w-5 text-gray-400` })
                    ) : null}
                </div>
            )}
            <input
                id={id}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${icon ? 'pl-10' : ''}`}
                {...props}
            />
        </div>
    </div>
);