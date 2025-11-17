// Catálogo de fabricantes e modelos de equipamentos
// Este arquivo pode ser expandido conforme necessário

export interface EquipmentCatalog {
    [manufacturer: string]: string[];
}

export const equipmentCatalog: EquipmentCatalog = {
    'DIMEP': [
        // Controle de acesso (catracas, controladores, leitores)
        'Compact Gate',          // catraca com leitura facial, biometria, QR code :contentReference[oaicite:0]{index=0}  
        'New BAP',               // catraca New BAP :contentReference[oaicite:1]{index=1}  
        'BAP Fancy Line II V2',  // catraca BAP Fancy Line II V2 :contentReference[oaicite:2]{index=2}  
        'BAP Black',             // catraca BAP Black :contentReference[oaicite:3]{index=3}  
        'Face Access Ultra',     // terminal facial para controle de acesso :contentReference[oaicite:4]{index=4}  
        'CM3 Controlador de Acesso', // controlador para portas, integra com Access II :contentReference[oaicite:5]{index=5}  

        // Relógios de Ponto (REP / Ponto Eletrônico)
        'D-REP Facial',           // relógio facial (biometria de face) :contentReference[oaicite:6]{index=6}  
        'Smart Point',            // Relógio de Ponto Smart Point (Wi-Fi) :contentReference[oaicite:7]{index=7}  
        'Smart Point Bus',        // versão móvel (“BUS”) do Smart Point :contentReference[oaicite:8]{index=8}  
        'Smart Print Facial',     // impressão + leitura facial :contentReference[oaicite:9]{index=9}  
        'PrintPoint III',         // relógio de ponto térmico / biométrico mais clássico :contentReference[oaicite:10]{index=10}  
        'Biopoint II-S',          // relógio biométrico de digitais :contentReference[oaicite:11]{index=11}  
        'MicroPoint XP',          // ponto + acionamento de catraca / porta :contentReference[oaicite:12]{index=12} 
        'MicroPoint II',          // ponto básico com leitor de proximidade :contentReference[oaicite:13]{index=13}
        'MicroPoint II PCD',      // versão do MicroPoint II para pessoas com deficiência :contentReference[oaicite:14]{index=14}
        'MicroPoint ID',        // versão do MicroPoint II com leitor de cartão :contentReference[oaicite:15]{index=15}
        'MicroPoint Bio',       // versão do MicroPoint II com leitor biométrico :contentReference[oaicite:16]{index=16}
        'MicroPoint Face',      // versão do MicroPoint II com leitor facial :contentReference[oaicite:17]{index=17}
        'MicroPoint Face PCD'  // versão do MicroPoint Face para pessoas com deficiência :contentReference[oaicite:18]{index=18}
    ],
    'ControliD': [
        // Relógios de ponto / REP
        'iDClass Bio',               // biométrico digital :contentReference[oaicite:0]{index=0}  
        'iDClass Bio Prox',          // biométrico + cartão proximidade :contentReference[oaicite:1]{index=1}  
        'iDClass Facial',            // reconhecimento facial no REP :contentReference[oaicite:2]{index=2}  
        'iDClass Bio Barras',        // biométrico + código de barras :contentReference[oaicite:3]{index=3}  
        'iDClass 373',               // modelo para Portaria 373 :contentReference[oaicite:4]{index=4}  

        // Controladores de acesso / Terminais
        'iDFlex',                     // controlador de acesso biometria / proximidade / senha :contentReference[oaicite:5]{index=5}  
        'iDProx Compact',             // leitor de cartão proximidade compacto :contentReference[oaicite:6]{index=6}  
        'iDProx Slim',                // versão slim do leitor de proximidade :contentReference[oaicite:7]{index=7}  
        'iDProx USB',                 // leitor de cartões com interface USB :contentReference[oaicite:8]{index=8}  
        'iDFace Max',                 // terminal de acesso facial mais robusto :contentReference[oaicite:9]{index=9}  
        'iDAccess Pro Prox',          // controlador de acesso com cartão proximidade :contentReference[oaicite:10]{index=10}  
        'iDAccess Nano Prox',         // versão compacta com proximidade :contentReference[oaicite:11]{index=11}  
        'iDAccess Nano Slave',        // controlador escravo para sistema mestre-escravo :contentReference[oaicite:12]{index=12}  

        // Leitores biométricos independentes
        'iDBio',                       // leitor biométrico (impressão digital) USB / RS-232 :contentReference[oaicite:13]{index=13}  

        // Leitores para veículos / UHF
        'iDUHF',                       // leitor UHF para controle de acesso de veículos :contentReference[oaicite:14]{index=14}  
        'iDUHF Lite',                  // versão leve / IP65 do leitor UHF :contentReference[oaicite:15]{index=15}  

        // Fechaduras digitais
        'iDLock Bio'                  // fechadura digital biométrica com Bluetooth :contentReference[oaicite:16]{index=16}  
    ],
    'Intelbras': [
        'SS 3530 MF',
        'SS 3510 MF',
        'SS 7500 MF',
        'FR 1211',
        'FR 1311',
        'TF 373'
    ],
    'Hikvision': [
        'DS-K1T341',
        'DS-K1T671',
        'MinMoe',
        'DS-K1T606',
        'ProFace X',
        'ValueFace'
    ],
    'ZKTeco': [
        'F18',
        'F19',
        'SF100',
        'SF400',
        'MB560',
        'MB360',
        'ProFace X'
    ],
    'Topdata': [
        // Relógios de Ponto / REP / Ponto Eletrônico
        'Inner REP Plus',                         // modelo clássico de REP :contentReference[oaicite:0]{index=0}  
        'Inner Ponto 4',                          // modelo de ponto eletrônico sem impressão segundo a Topdata :contentReference[oaicite:1]{index=1}  
        'Inner 373',                              // controle de ponto para empresas sob a Portaria 373 do MTE :contentReference[oaicite:2]{index=2}  
        'Relógio Pontto',                         // relógio cartográfico, linha mais simples/tradicional :contentReference[oaicite:3]{index=3}  
        'Leitor facial F4 / T4',                   // leitor facial Topdata :contentReference[oaicite:4]{index=4}  

        // Catracas / Controle de Acesso
        'Catraca Revolution Easy',                // catraca da linha Easy :contentReference[oaicite:5]{index=5}  
        'Catraca Revolution Facial',              // catraca Revolution com reconhecimento facial :contentReference[oaicite:6]{index=6}  
        'Catraca Fit 4',                           // catraca compacta da linha 4 :contentReference[oaicite:7]{index=7}  
        'Catraca Fit Facial',                      // catraca Fit com leitor facial :contentReference[oaicite:8]{index=8}  
        'Catraca Box 4',                           // catraca robusta, pedestal / balcão em inox :contentReference[oaicite:9]{index=9}  
        'Catraca Box Easy',                        // versão fácil da Box com leitor facial integrado :contentReference[oaicite:10]{index=10}  
        'Catraca Flow',                            // catraca para controle de fluxo (ex: limite de pessoas) :contentReference[oaicite:11]{index=11}  
        'Catraca PNE 4'                            // modelo para pessoas com necessidades especiais, segundo a linha “4” da Topdata :contentReference[oaicite:12]{index=12}  
    ],
    'GAREN': [
        'Cancela Intense AC',
        'Cancela Intense BLDC',
        'Cancela Intense BLDC (Inox)',
        'Cancela BLDC Pedágio',
        'Cancela Classic AC',
        'Cancela Classic DC',
        'Cancela Compacta',
        'Cancela Flow'
    ],
    'CAME': [
        'Gard GT4',                 // cancela para serviços pesados / uso intensivo :contentReference[oaicite:0]{index=0}  
        'Gard GT8',                 // cancela 24 V para uso residencial ou industrial :contentReference[oaicite:1]{index=1}  
        'Gard PT Brushless',        // modelo com motor brushless (alto desempenho) :contentReference[oaicite:2]{index=2}  
        'Gard PX Brushless',        // versão PX com motor brushless :contentReference[oaicite:3]{index=3}  
        'Gard 3250',                 // cancela para estacionamentos / aplicações específicas :contentReference[oaicite:4]{index=4}  
        'Gard 5000',                 // cancelas para pontos de acesso de tráfego intenso :contentReference[oaicite:5]{index=5}  
        'Gard 12',                    // cancela “especial”, para aplicações especiais segundo a CAME :contentReference[oaicite:6]{index=6}  
        'GPX',                        // cancela Brushless para locais de alta rotatividade :contentReference[oaicite:7]{index=7}  
        'Cancela Alta Segurança (GT8 com Kit)',  // cancela da linha de alta segurança da CAME :contentReference[oaicite:8]{index=8}  
    ],
    'Digicon': [
        'MCA Acesso/Painel',
        'MCANET II',
        'MRA',
        'CATRAX PLUS',
        'CATRAX MASTER',
        'TORNIQUETE TX1500',
        'TORNIQUETE DUO',
        'DCLOCK'

    ]
};

// Função auxiliar para obter todos os fabricantes
export const getManufacturers = (): string[] => {
    return Object.keys(equipmentCatalog).sort();
};

// Função auxiliar para obter modelos de um fabricante
export const getModelsByManufacturer = (manufacturer: string): string[] => {
    return equipmentCatalog[manufacturer] || [];
};
