import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary';
    isLoading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', isLoading = false, disabled, ...props }) => (
    <button
        className={`w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
      ${variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}
      ${(disabled || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        disabled={disabled || isLoading}
        {...props}
    >
        {isLoading ? (
            <Loader2 className="animate-spin h-5 w-5" />
        ) : (
            children
        )}
    </button>
);