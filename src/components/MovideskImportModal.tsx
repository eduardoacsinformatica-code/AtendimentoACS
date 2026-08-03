import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Search,
  Ticket,
  Calendar,
  Building2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Hash,
  RefreshCw,
  FileText
} from 'lucide-react';
import { TechSettings, ReportData } from '../types';
import { formatDateToPtBr } from '../utils/formatters';

interface MovideskAgent {
  id: string;
  name: string;
}

interface MovideskTicketItem {
  id: string;
  protocol: string;
  subject: string;
  descricaoChamado: string;
  fato: string;
  createdDate: string;
  dateFormatted: string;
  cliente: string;
  cnpj: string;
  tecnico: string;
  acompanhado: string;
  status: string;
  statusOriginal: string;
}

interface MovideskImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TechSettings;
  onSelectTicket: (ticketData: Partial<ReportData>) => void;
}

export const MovideskImportModal: React.FC<MovideskImportModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSelectTicket,
}) => {
  const [step, setStep] = useState<'agents' | 'tickets' | 'direct'>('agents');
  
  // Agents State
  const [agents, setAgents] = useState<MovideskAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<MovideskAgent | null>(null);

  // Tickets State
  const [tickets, setTickets] = useState<MovideskTicketItem[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketSearch, setTicketSearch] = useState('');
  const [dateRangeInfo, setDateRangeInfo] = useState<string>('');

  // Direct Ticket ID State
  const [directTicketId, setDirectTicketId] = useState('');
  const [loadingDirect, setLoadingDirect] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);

  // Load Agents when Modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('agents');
      fetchAgents();
    }
  }, [isOpen]);

  const fetchAgents = async () => {
    setLoadingAgents(true);
    setAgentsError(null);
    try {
      const token = settings.movideskToken || '75762c40-5399-4b83-b958-c265fbf5d6fb';
      const res = await fetch(`/api/movidesk/agents?token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar lista de atendentes.');
      }

      setAgents(data.agents || []);
    } catch (err) {
      setAgentsError(err instanceof Error ? err.message : 'Erro ao conectar ao Movidesk.');
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleSelectAgent = (agent: MovideskAgent | null) => {
    setSelectedAgent(agent);
    setStep('tickets');
    fetchTicketsForAgent(agent);
  };

  const fetchTicketsForAgent = async (agent: MovideskAgent | null) => {
    setLoadingTickets(true);
    setTicketsError(null);
    try {
      const token = settings.movideskToken || '75762c40-5399-4b83-b958-c265fbf5d6fb';
      let url = `/api/movidesk/tickets?token=${encodeURIComponent(token)}`;

      if (agent) {
        if (agent.id && agent.id !== 'all') {
          url += `&agentId=${encodeURIComponent(agent.id)}`;
        }
        url += `&agentName=${encodeURIComponent(agent.name)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao carregar chamados.');
      }

      setTickets(data.tickets || []);
      if (data.startDate && data.endDate) {
        setDateRangeInfo(`${formatDateToPtBr(data.startDate)} até ${formatDateToPtBr(data.endDate)}`);
      } else {
        setDateRangeInfo('Últimos 7 dias e hoje');
      }
    } catch (err) {
      setTicketsError(err instanceof Error ? err.message : 'Erro ao consultar chamados.');
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleImportSingleTicket = async (ticketItem: MovideskTicketItem) => {
    setLoadingTickets(true);
    try {
      const token = settings.movideskToken || '75762c40-5399-4b83-b958-c265fbf5d6fb';
      const ticketNum = ticketItem.id || ticketItem.protocol;
      const res = await fetch(`/api/movidesk/ticket?id=${encodeURIComponent(ticketNum)}&token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const data = await res.json();
        onSelectTicket({
          ticket: data.ticket || ticketNum,
          cliente: data.cliente || ticketItem.cliente,
          cnpj: data.cnpj || ticketItem.cnpj,
          tecnico: data.tecnico || ticketItem.tecnico || '',
          acompanhado: data.acompanhado || ticketItem.acompanhado,
          descricaoChamado: data.descricaoChamado || ticketItem.descricaoChamado || ticketItem.subject,
          fato: '',
          status: (data.status as any) || ticketItem.status,
          data: data.data || ticketItem.dateFormatted,
        });
        onClose();
        return;
      }
    } catch {
      // Fall back to ticketItem if single fetch fails
    } finally {
      setLoadingTickets(false);
    }

    onSelectTicket({
      ticket: ticketItem.id || ticketItem.protocol,
      cliente: ticketItem.cliente,
      cnpj: ticketItem.cnpj,
      tecnico: ticketItem.tecnico || '',
      acompanhado: ticketItem.acompanhado,
      descricaoChamado: ticketItem.descricaoChamado || ticketItem.subject,
      fato: '',
      status: ticketItem.status as any,
      data: ticketItem.dateFormatted,
    });
    onClose();
  };

  const handleFetchDirectTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTicketId.trim()) return;

    setLoadingDirect(true);
    setDirectError(null);

    try {
      const token = settings.movideskToken || '75762c40-5399-4b83-b958-c265fbf5d6fb';
      const res = await fetch(`/api/movidesk/ticket?id=${encodeURIComponent(directTicketId.trim())}&token=${encodeURIComponent(token)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Chamado não encontrado.');
      }

      onSelectTicket({
        ticket: data.ticket || directTicketId.trim(),
        cliente: data.cliente || '',
        cnpj: data.cnpj || '',
        tecnico: '', // Deixa em branco para o usuário preencher
        acompanhado: data.acompanhado || '',
        descricaoChamado: data.descricaoChamado || '',
        fato: data.fato || '',
        status: data.status || 'EM_ANDAMENTO',
        data: data.data || '',
      });
      onClose();
    } catch (err) {
      setDirectError(err instanceof Error ? err.message : 'Erro ao carregar chamado.');
    } finally {
      setLoadingDirect(false);
    }
  };

  if (!isOpen) return null;

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const filteredTickets = tickets.filter(
    (t) =>
      t.id.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.protocol.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.cliente.toLowerCase().includes(ticketSearch.toLowerCase()) ||
      t.subject.toLowerCase().includes(ticketSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Importar do Movidesk
              </h3>
              <p className="text-xs text-slate-400">
                Acessando acsautomacao.movidesk.com
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStep(step === 'direct' ? 'agents' : 'direct')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              {step === 'direct' ? 'Ver Atendentes' : 'Nº do Ticket Direto'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">

          {/* STEP 1: SELECT ATTENDANT */}
          {step === 'agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-200 flex items-center">
                    <UserCheck className="w-4 h-4 mr-2 text-emerald-400" />
                    Selecione o Atendente Responsável
                  </h4>
                  <p className="text-xs text-slate-400">
                    Escolha um atendente para listar os chamados dos últimos 7 dias e de hoje.
                  </p>
                </div>
                <button
                  onClick={fetchAgents}
                  disabled={loadingAgents}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs flex items-center gap-1"
                  title="Atualizar lista"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAgents ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Search Attendants */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Buscar atendente por nome (Ex: Fabiano, Visgueira)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Loading State */}
              {loadingAgents && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                  <p className="text-xs">Conectando ao Movidesk e buscando atendentes...</p>
                </div>
              )}

              {/* Error State */}
              {agentsError && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Não foi possível listar os atendentes:</p>
                    <p>{agentsError}</p>
                    <button
                      onClick={() => handleSelectAgent(null)}
                      className="mt-2 text-xs text-emerald-400 hover:underline font-medium"
                    >
                      Ver chamados de todos os atendentes mesmo assim →
                    </button>
                  </div>
                </div>
              )}

              {/* Agents Grid */}
              {!loadingAgents && !agentsError && (
                <div className="space-y-2">
                  {/* All Agents Option */}
                  <button
                    onClick={() => handleSelectAgent(null)}
                    className="w-full p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center justify-between transition-all group text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        TODOS
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">
                          Todos os Atendentes
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Listar chamados recentes de toda a equipe
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                  </button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {filteredAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center justify-between transition-all group text-left"
                      >
                        <div className="flex items-center space-x-2.5 truncate">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 truncate">
                            {agent.name}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 shrink-0" />
                      </button>
                    ))}

                    {filteredAgents.length === 0 && (
                      <div className="col-span-2 py-6 text-center text-slate-500 text-xs">
                        Nenhum atendente encontrado com "{agentSearch}".
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: TICKETS LIST FOR SELECTED ATTENDANT */}
          {step === 'tickets' && (
            <div className="space-y-4">
              {/* Back to agents & Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={() => setStep('agents')}
                  className="inline-flex items-center text-xs text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Trocar Atendente
                </button>

                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-emerald-950/90 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700/60 font-bold flex items-center shadow-sm">
                    <UserCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                    Atendente: <span className="ml-1 text-white">{selectedAgent ? selectedAgent.name : 'Todos os Atendentes'}</span>
                  </span>
                  <button
                    onClick={() => fetchTicketsForAgent(selectedAgent)}
                    disabled={loadingTickets}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                    title="Atualizar lista de chamados"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTickets ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Date Filter Badge */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center text-slate-300">
                  <Calendar className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Período: <strong className="ml-1 text-slate-200">{dateRangeInfo}</strong>
                </span>
                <span className="text-[11px] text-slate-500">
                  {filteredTickets.length} chamado(s) encontrado(s)
                </span>
              </div>

              {/* Ticket Search Filter */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  placeholder="Filtrar por ticket, cliente ou assunto (Ex: 20260731, Posto Cometa)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Loading State */}
              {loadingTickets && (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-400" />
                  <p className="text-xs">Buscando chamados no Movidesk...</p>
                </div>
              )}

              {/* Error State */}
              {ticketsError && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Erro ao carregar chamados:</p>
                    <p>{ticketsError}</p>
                  </div>
                </div>
              )}

              {/* Tickets List */}
              {!loadingTickets && !ticketsError && (
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {filteredTickets.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleImportSingleTicket(item)}
                      className="p-3.5 bg-slate-950 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/60 rounded-xl cursor-pointer transition-all group space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="bg-slate-900 border border-slate-700 text-emerald-400 font-mono text-xs font-bold px-2 py-0.5 rounded">
                            #{item.protocol || item.id}
                          </span>
                          <span className="text-[11px] text-slate-400 flex items-center">
                            <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                            {formatDateToPtBr(item.dateFormatted)}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            item.status === 'CONCLUIDO'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {item.statusOriginal || item.status}
                        </span>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 flex items-center">
                          <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400 shrink-0" />
                          {item.cliente}
                          {item.cnpj && (
                            <span className="ml-2 text-[11px] text-slate-500 font-normal">
                              ({item.cnpj})
                            </span>
                          )}
                        </p>
                        {item.subject && (
                          <p className="text-xs text-slate-300 mt-1 line-clamp-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                            {item.subject}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                        <span className="flex items-center font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-400 mr-1 shrink-0" />
                          Técnico/Atendente: <strong className="ml-1 text-emerald-300 font-semibold">{item.tecnico || selectedAgent?.name || 'Não informado'}</strong>
                        </span>
                        <span className="text-emerald-400 font-semibold group-hover:underline flex items-center shrink-0">
                          Importar <ChevronRight className="w-3 h-3 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  ))}

                  {filteredTickets.length === 0 && (
                    <div className="py-10 text-center text-slate-500 text-xs space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-700" />
                      <p>Nenhum chamado encontrado para o filtro selecionado.</p>
                      <p className="text-[11px] text-slate-600">
                        Tente selecionar outro atendente ou informe o número direto do ticket.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: DIRECT TICKET INPUT */}
          {step === 'direct' && (
            <form onSubmit={handleFetchDirectTicket} className="space-y-4 py-2">
              <div>
                <h4 className="text-sm font-semibold text-slate-200 flex items-center mb-1">
                  <Hash className="w-4 h-4 mr-2 text-emerald-400" />
                  Informe o Número do Ticket / Chamado
                </h4>
                <p className="text-xs text-slate-400">
                  Digite o número ou protocolo exato do Movidesk para importar os dados diretamente.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={directTicketId}
                  onChange={(e) => setDirectTicketId(e.target.value)}
                  placeholder="Ex: 20260731000057"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />
              </div>

              {directError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{directError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('agents')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Voltar para Atendentes
                </button>
                <button
                  type="submit"
                  disabled={loadingDirect || !directTicketId.trim()}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {loadingDirect ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Importar Chamado
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Integração Direta API Movidesk</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
};
