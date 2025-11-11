declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: {
            startY?: number;
            head?: string[][];
            body?: string[][];
            theme?: string;
            headStyles?: Record<string, unknown>;
            styles?: Record<string, unknown>;
            columnStyles?: Record<number, Record<string, unknown>>;
        }) => jsPDF;
    }
}

