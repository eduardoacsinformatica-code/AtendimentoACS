export type ReportStatus = 
  | 'CONCLUIDO' 
  | 'EM_ANDAMENTO' 
  | 'PENDENTE' 
  | 'AGUARDANDO_CLIENTE' 
  | 'AGUARDANDO_PECA';

export type ServiceType = 
  | 'PRESENCIAL' 
  | 'REMOTO' 
  | 'TELEFONICO' 
  | 'LABORATORIO';

export interface ReportData {
  ticket: string;
  cliente: string;
  cnpj: string;
  tecnico: string;
  acompanhado: string;
  data: string; // YYYY-MM-DD
  status: ReportStatus;
  tipoAtendimento: ServiceType;
  descricaoChamado?: string;
  fato: string;
  diagnostico: string;
  observacoes: string;
  incluirAssinatura: boolean;
  empresaAssinatura: string;
  whatsappDestinatario: string; // Optional phone number
  fotos: string[]; // Base64 or Data URL array of attached photos
}

export interface SavedReport extends ReportData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickSnippet {
  id: string;
  category: 'fato' | 'diagnostico' | 'observacoes';
  title: string;
  text: string;
}

export interface TechSettings {
  defaultTecnico: string;
  defaultEmpresa: string;
  autoFormatCnpj: boolean;
  whatsappFormatStyle: 'detalhado';
  movideskToken?: string;
  movideskDomain?: string;
}
