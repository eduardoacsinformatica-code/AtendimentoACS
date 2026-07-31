import { QuickSnippet } from '../types';

export const DEFAULT_SNIPPETS: QuickSnippet[] = [
  // Fato Constatado Snippets
  {
    id: 'f1',
    category: 'fato',
    title: 'Lentidão no Sistema / Computador',
    text: 'Equipamento apresentando extrema lentidão ao inicializar e ao abrir sistemas de trabalho principais.',
  },
  {
    id: 'f2',
    category: 'fato',
    title: 'Impressora Sem Comunicação',
    text: 'Impressora não responde aos comandos de impressão enviados pela rede local ou USB.',
  },
  {
    id: 'f3',
    category: 'fato',
    title: 'Erro de Certificado Digital',
    text: 'Falha na emissão de NF-e por erro de comunicação ou expiração do Certificado Digital (A1/A3).',
  },
  {
    id: 'f4',
    category: 'fato',
    title: 'Sem Acesso à Internet / Rede Local',
    text: 'Estação de trabalho desconectada da rede local e sem acesso aos diretórios de servidor e internet.',
  },
  {
    id: 'f5',
    category: 'fato',
    title: 'Sem Sinal de Vídeo / Não Liga',
    text: 'Computador liga as ventoinhas mas não gera imagem no monitor, emitindo sinais sonoros de alerta.',
  },
  {
    id: 'f6',
    category: 'fato',
    title: 'Erro no Banco de Dados / PDV',
    text: 'Sistema de vendas (PDV / ERP) exibe mensagem de falha de conexão com o banco de dados SQL.',
  },

  // Diagnóstico e Ações Snippets
  {
    id: 'd1',
    category: 'diagnostico',
    title: 'Manutenção Preventiva / Limpeza de Disco',
    text: 'Realizada limpeza de arquivos temporários, otimização de inicialização do Windows, verificação de malware e atualização de drivers do sistema.',
  },
  {
    id: 'd2',
    category: 'diagnostico',
    title: 'Reconfiguração do Spooler e Impressora',
    text: 'Reiniciado o serviço de Spooler de impressão, removidos trabalhos travados na fila e reinstalado o driver atualizado da impressora.',
  },
  {
    id: 'd3',
    category: 'diagnostico',
    title: 'Instalação / Atualização de Certificado',
    text: 'Realizada a importação da cadeia de certificados, atualização do aplicativo emissor e reconfiguração dos parâmetros de validade.',
  },
  {
    id: 'd4',
    category: 'diagnostico',
    title: 'Ajuste de Conectividade de Rede',
    text: 'Identificado mal contato no cabo de rede Rj45. Efetuada a nova crimpagem do conector, renovado o IP via DHCP e testado a estabilidade da conexão.',
  },
  {
    id: 'd5',
    category: 'diagnostico',
    title: 'Troca de Fonte / Limpeza Interna',
    text: 'Constatado defeito na fonte de alimentação. Efetuada a substituição da peça por nova fonte de 500W e realizada a limpeza interna de poeira nos coolers.',
  },
  {
    id: 'd6',
    category: 'diagnostico',
    title: 'Restauração de Serviços de Banco de Dados',
    text: 'Identificado que o serviço do banco de dados estava parado. Efetuado o start do serviço, verificação de integridade dos arquivos e liberação da porta no Firewall.',
  },

  // Observações
  {
    id: 'o1',
    category: 'observacoes',
    title: 'Recomendação de Nobreak',
    text: 'Recomendada a aquisição de um Nobreak de no mínimo 700VA para proteger o equipamento contra oscilações na rede elétrica.',
  },
  {
    id: 'o2',
    category: 'observacoes',
    title: 'Recomendação de Upgrade para SSD',
    text: 'Sugerida a substituição do HD mecânico por um SSD para melhorar significativamente a velocidade de resposta do sistema.',
  },
  {
    id: 'o3',
    category: 'observacoes',
    title: 'Aguardando Aprovação de Orçamento',
    text: 'Equipamento permanece em testes no laboratório aguardando aprovação do orçamento de peças pelo cliente.',
  },
];
