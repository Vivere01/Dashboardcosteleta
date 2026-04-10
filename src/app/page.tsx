"use client";

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { Scissors, Users, DollarSign, TrendingUp, Loader2, Info, Crown, CreditCard, Calendar } from 'lucide-react';
import Papa from 'papaparse';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1GmYrrCJWdc2kLGNxEdTJSsdZ-6H8Y_md9GsK5svSjlo/export?format=csv&gid=545750877";

interface ClientRecord {
  name: string;
  totalSpent: number;
  appointments: number;
  firstDateISO: string;
  firstDateDisplay: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [allData, setAllData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [metrics, setMetrics] = useState({
    revenue: 0,
    subscriptionsRevenue: 0,
    singleServicesRevenue: 0,
    appointments: 0,
    uniqueClients: 0,
    totalServices: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);
  const [subscriptionVsSingleData, setSubscriptionVsSingleData] = useState<any[]>([]);
  const [clientRanking, setClientRanking] = useState<ClientRecord[]>([]);

  useEffect(() => {
    fetch(SHEET_URL)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            setAllData(results.data);
            setLoading(false);
          },
          error: (error: Error) => {
            console.error("Erro ao fazer parse do CSV:", error);
            setLoading(false);
          }
        });
      })
      .catch((error) => {
        console.error("Erro ao baixar os dados da planilha:", error);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (allData.length > 0) {
      processData(allData);
    }
  }, [allData, startDate, endDate]);

  const processData = (data: any[]) => {
    let totalRevenue = 0;
    let subsRevenue = 0;
    let singleRevenue = 0;
    let appointmentsCount = 0;
    let totalServicesCount = 0;

    const namesSet = new Set<string>();
    const appointmentsSet = new Set<string>();
    const servicesMap: Record<string, number> = {};
    const revenueByDayMap: Record<string, { assinaturas: number, avulsos: number }> = {};
    const clientsMap = new Map<string, ClientRecord>();
    const clientDaysMap: Record<string, Set<string>> = {};

    data.forEach(row => {
      // Localizar colunas dinamicamente para evitar problemas de encoding (ex: SERVI?OS:)
      const colNames = Object.keys(row);
      const servicosKey = colNames.find(k => k.toUpperCase().includes('SERVI')) || 'SERVIÇOS:';
      const planoKey = colNames.find(k => k.toUpperCase().includes('PLANO')) || 'PLANO DE ASSINATURA:';
      const valorKey = colNames.find(k => k.toUpperCase().includes('VALOR')) || 'VALOR:';
      const dataKey = colNames.find(k => k.toUpperCase().includes('DATA')) || 'DATA / AGENDAMENTO:';
      const nomeKeyRaw = colNames.find(k => k.toUpperCase().includes('NOME')) || 'NOME:';

      // Extrair e validar data
      const dataRaw = row[dataKey];
      let isoDate = '';

      if (dataRaw && dataRaw.trim() !== '') {
        const parts = dataRaw.split(' ')[0].split('/');
        if (parts.length === 3) {
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          isoDate = `${y}-${m}-${d}`;
        }
      }

      // Regra de Filtro de Data
      if (startDate && isoDate && isoDate < startDate) return;
      if (endDate && isoDate && isoDate > endDate) return;
      if ((startDate || endDate) && !isoDate) return;

      // Verificação Plano de Assinatura vs Avulso
      const hasServicos = row[servicosKey] && row[servicosKey].trim() !== '';
      const hasPlano = row[planoKey] && row[planoKey].trim() !== '';

      let rowSubsRevenue = 0;
      let rowSingleRevenue = 0;

      // Pegar todo o dinheiro do plano
      if (hasPlano) {
        const planoStr = row[planoKey];
        const matches = [...planoStr.matchAll(/R\$\s*([\d,.]+)/g)];
        matches.forEach(m => {
           rowSubsRevenue += parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        });
      }

      // Pegar todo o dinheiro dos serviços (suporta múltiplos serviços separados por vírgula)
      if (hasServicos) {
        const servicoStr = row[servicosKey];
        const matches = [...servicoStr.matchAll(/R\$\s*([\d,.]+)/g)];
        matches.forEach(m => {
           rowSingleRevenue += parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        });
      }

      // Substituímos o "valor" bruto para proteger o Dashboard caso a planilha esteja com fórmulas quebradas
      const valorCorrigido = rowSubsRevenue + rowSingleRevenue;
      totalRevenue += valorCorrigido; // Agora só soma 1x
      
      subsRevenue += rowSubsRevenue;
      singleRevenue += rowSingleRevenue;

      // Clientes únicos e Ranking
      const nomeRow = row[nomeKeyRaw];
      if (nomeRow && nomeRow.trim() !== '') {
        const nomeKey = nomeRow.trim().toLowerCase();
        const nomeDisplay = nomeRow.trim();
        namesSet.add(nomeKey);

        const dateForClient = isoDate || dataRaw || 'Sem Data';
        
        // Count unique appointments by (Client + Date)
        const appointmentKey = `${nomeKey}-${dateForClient}`;
        appointmentsSet.add(appointmentKey);

        if (!clientDaysMap[nomeKey]) clientDaysMap[nomeKey] = new Set();
        clientDaysMap[nomeKey].add(dateForClient);

        const existing = clientsMap.get(nomeKey);
        const currentSpent = existing ? existing.totalSpent : 0;
        let currentFirstISO = existing ? existing.firstDateISO : isoDate;
        let currentFirstDisplay = existing ? existing.firstDateDisplay : dataRaw;

        // Atualiza a primeira data se a atual for mais antiga
        if (isoDate && existing && existing.firstDateISO !== '9999-99-99' && isoDate < existing.firstDateISO) {
          currentFirstISO = isoDate;
          currentFirstDisplay = dataRaw;
        }

        clientsMap.set(nomeKey, {
          name: existing?.name || nomeDisplay, 
          totalSpent: currentSpent + valorCorrigido,
          appointments: clientDaysMap[nomeKey].size,
          firstDateISO: currentFirstISO || '9999-99-99',
          firstDateDisplay: currentFirstDisplay || 'Sem Data'
        });
      }

      // Serviços
      const servicosRawStr = row[servicosKey];
      if (servicosRawStr && servicosRawStr.trim() !== '') {
        const splitServicos = servicosRawStr.split(/[,+]/).map((s: string) => s.trim()).filter(Boolean);
        splitServicos.forEach((s: string) => {
          servicesMap[s] = (servicesMap[s] || 0) + 1;
          totalServicesCount++;
        });
      }

      // Agrupar Receitas pelo Dia (padrão ISO para garantir ordem no gráfico)
      const dateKey = isoDate || dataRaw?.split(' ')[0] || 'Sem Data';

      if (!revenueByDayMap[dateKey]) {
        revenueByDayMap[dateKey] = { assinaturas: 0, avulsos: 0 };
      }
      
      revenueByDayMap[dateKey].assinaturas += rowSubsRevenue;
      revenueByDayMap[dateKey].avulsos += rowSingleRevenue;
    });

    setMetrics({
      revenue: totalRevenue,
      subscriptionsRevenue: subsRevenue,
      singleServicesRevenue: singleRevenue,
      appointments: appointmentsSet.size,
      uniqueClients: namesSet.size,
      totalServices: totalServicesCount
    });

    // Top Serviços
    const parsedServices = Object.entries(servicesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    setServiceData(parsedServices);

    // Receita por Dia ordenado e mapeado para exibição (DD/MM)
    const parsedRevenueByDay = Object.entries(revenueByDayMap)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([isoDateKey, vals]) => {
        const parts = isoDateKey.split('-');
        const displayName = parts.length === 3 ? `${parts[2]}/${parts[1]}` : isoDateKey;
        return {
          name: displayName,
          'Assinaturas': vals.assinaturas,
          'Avulsos': vals.avulsos
        };
      });
    setRevenueData(parsedRevenueByDay);

    // Dados de Pizza para Assinatura vs Avulso
    setSubscriptionVsSingleData([
      { name: 'Receita de Assinaturas', value: subsRevenue, color: '#f59e0b' },
      { name: 'Serviços Avulsos', value: singleRevenue, color: '#3b82f6' }
    ]);

    // Format Client Ranking
    const rankingArray = Array.from(clientsMap.values())
      .sort((a, b) => b.totalSpent - a.totalSpent); // Sort by highest spend
    setClientRanking(rankingArray);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 font-sans">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500 mb-6" />
        <p className="text-xl font-light tracking-wide">Integando dados da inteligência...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans flex flex-col selection:bg-amber-500/30">

      {/* Premium Navbar */}
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Scissors className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Dashboard Costeleta</h1>
              <p className="text-xs text-amber-500/80 font-medium">Painel Executivo Premium</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="https://docs.google.com/spreadsheets/d/1GmYrrCJWdc2kLGNxEdTJSsdZ-6H8Y_md9GsK5svSjlo/edit#gid=545750877" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-amber-400 transition-colors hidden sm:block">Planilha de Base</a>
            <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white">Administrador</p>
                <p className="text-xs text-zinc-500">Acesso Total</p>
              </div>
              <img src="https://ui-avatars.com/api/?name=Admin&background=18181b&color=f59e0b" alt="Admin" className="w-10 h-10 rounded-full border-2 border-white/10" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 w-full flex-grow">

        {/* Header Section */}
        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Desempenho Geral</h2>
            <p className="text-zinc-400 mt-2">Visão consolidada em tempo real da Barbearia Costeleta.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            {/* Filtro de Datas */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 backdrop-blur-xl h-11">
              <div className="pl-3 pr-2 flex items-center text-zinc-400">
                <Calendar className="w-4 h-4" />
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 px-2 py-1 outline-none [color-scheme:dark] rounded-lg transition-colors hover:bg-white/5 focus:bg-white/10 border border-transparent focus:border-amber-500/50"
              />
              <span className="text-zinc-500 px-2 text-xs font-medium">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm text-zinc-300 px-2 py-1 outline-none [color-scheme:dark] rounded-lg transition-colors hover:bg-white/5 focus:bg-white/10 border border-transparent focus:border-amber-500/50"
              />
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="ml-2 mr-1 px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-md transition-colors font-medium border border-red-500/10"
                >
                  Limpar
                </button>
              )}
            </div>

            <button onClick={() => window.location.reload()} className="group relative inline-flex h-11 items-center justify-center overflow-hidden rounded-xl bg-amber-500 px-6 font-medium text-black transition-all hover:bg-amber-400 shrink-0 shadow-lg shadow-amber-500/20">
              <TrendingUp className="w-4 h-4 mr-2" />
              Atualizar Origem
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
            </button>
          </div>
        </div>

        {allData.length === 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-xl p-5 mb-10 flex items-start gap-4 backdrop-blur-sm">
            <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
              <Info className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-amber-400 mb-1">A interface está pronta, mas a planilha tem zero resultados.</h4>
              <p className="text-amber-200/80 leading-relaxed">Sua planilha Google consta atualmente como vazia. Quando novos agendamentos forem adicionados lá, os relatórios aparecerão.</p>
            </div>
          </div>
        )}

        {allData.length > 0 && metrics.appointments === 0 && (startDate || endDate) && (
          <div className="bg-zinc-800/50 border border-zinc-700 text-zinc-300 rounded-xl p-5 mb-10 flex items-center justify-center backdrop-blur-sm">
            <p>Nenhum agendamento encontrado no período selecionado.</p>
          </div>
        )}

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
          {/* Receita Bruta */}
          <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:bg-white/[0.07] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Receita Total</h3>
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.revenue)}
            </div>
            <div className="mt-4 w-full bg-white/10 h-1 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-full w-[100%]"></div>
            </div>
          </div>

          {/* Receita Assinaturas */}
          <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:bg-white/[0.07] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Assinaturas (Ativas)</h3>
              <div className="bg-amber-500/10 p-2 rounded-lg text-amber-400 group-hover:scale-110 transition-transform">
                <Crown className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.subscriptionsRevenue)}
            </div>
            <p className="text-xs text-zinc-500 mt-2 flex items-center font-medium">
              <span className="text-amber-500 mr-2 flex items-center">
                {metrics.revenue > 0 ? ((metrics.subscriptionsRevenue / metrics.revenue) * 100).toFixed(0) : 0}%
              </span>
              da receita filtrada
            </p>
          </div>

          {/* Receita Avulsos */}
          <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:bg-white/[0.07] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Serviços Avulsos</h3>
              <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.singleServicesRevenue)}
            </div>
            <p className="text-xs text-zinc-500 mt-2 flex items-center font-medium">
              <span className="text-blue-400 mr-2 flex items-center">
                {metrics.revenue > 0 ? ((metrics.singleServicesRevenue / metrics.revenue) * 100).toFixed(0) : 0}%
              </span>
              da receita filtrada
            </p>
          </div>

          {/* Clientes */}
          <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:bg-white/[0.07] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Volume Atendido</h3>
              <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{metrics.appointments}</span>
              <span className="text-zinc-500 text-sm">atendimentos</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">
              Por <span className="text-zinc-300">{metrics.uniqueClients} clientes</span> únicos.
            </p>
          </div>

          {/* Quantidade de Serviços */}
          <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl group hover:bg-white/[0.07] transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-zinc-400 font-medium text-sm tracking-wide uppercase">Qtd. Serviços</h3>
              <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform">
                <Scissors className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white tracking-tight">{metrics.totalServices}</span>
              <span className="text-zinc-500 text-sm">serviços</span>
            </div>
            <p className="text-xs text-zinc-500 mt-2 font-medium">
              Média de <span className="text-zinc-300">{metrics.appointments > 0 ? (metrics.totalServices / metrics.appointments).toFixed(1) : 0}</span> por atendimento.
            </p>
          </div>
        </div>

        {/* Charts Middle Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Main Area Chart (Assinaturas vs Avulsos timeline) */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[400px]">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Desempenho de Receita: Assinaturas vs Avulsos
              </h3>
              <p className="text-sm text-zinc-400">Evolução diária dos tipos de faturamento filtrados.</p>
            </div>

            {revenueData.length > 0 ? (
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAssinaturas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAvulsos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 13 }} tickFormatter={(val) => `R$${val}`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="Assinaturas" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorAssinaturas)" activeDot={{ r: 6, strokeWidth: 0, fill: '#f59e0b' }} />
                    <Area type="monotone" dataKey="Avulsos" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAvulsos)" activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                Sem dados no período
              </div>
            )}
          </div>

          {/* Distribuição de Receita */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[400px]">
            <div className="mb-2">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Matriz de Receita
              </h3>
              <p className="text-sm text-zinc-400">Share Assinatura vs Avulso</p>
            </div>

            {subscriptionVsSingleData.some(d => d.value > 0) ? (
              <div className="flex-1 w-full flex-col flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={subscriptionVsSingleData} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">
                      {subscriptionVsSingleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                      formatter={(value: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Custom Legend for Pie Chart inside the box */}
                <div className="w-full mt-4 space-y-3">
                  {subscriptionVsSingleData.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-zinc-300">{item.name}</span>
                      </div>
                      <span className="font-semibold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm bg-white/[0.02] rounded-xl border border-dashed border-white/5 mt-4">
                Gráfico Indisponível
              </div>
            )}
          </div>
        </div>

        {/* Bottom Area: Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Serviços */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[400px]">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Scissors className="w-5 h-5 text-amber-500" />
                Raking de Serviços Populares
              </h3>
              <p className="text-sm text-zinc-400">Demanda em volume de corte, barba e demais pacotes.</p>
            </div>

            {serviceData.length > 0 ? (
              <div className="flex-1 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serviceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#ffffff10" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 13 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#e4e4e7', fontSize: 13, fontWeight: 500 }} width={120} />
                    <RechartsTooltip
                      cursor={{ fill: '#ffffff08' }}
                      contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    />
                    <Bar dataKey="count" name="Trabalhos Realizados" radius={[0, 6, 6, 0]} barSize={28}>
                      {
                        serviceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#fcd34d'} opacity={1 - (index * 0.15)} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                Nenhum histórico de serviços
              </div>
            )}
          </div>

          {/* Ranking de Clientes */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col h-[400px]">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Líderes de Receita (Top Clientes)
              </h3>
              <p className="text-sm text-zinc-400">Classificação por volume financeiro gerado.</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              {clientRanking.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#09090b]/80 backdrop-blur z-10">
                    <tr className="text-zinc-500 text-xs uppercase tracking-wider border-b border-white/10">
                      <th className="pb-3 font-medium">Top</th>
                      <th className="pb-3 font-medium">Cliente</th>
                      <th className="pb-3 font-medium hidden sm:table-cell">1º Registro</th>
                      <th className="pb-3 font-medium text-right">Valor Gasto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRanking.map((client, index) => (
                      <tr key={index} className="border-b border-white/[0.02] hover:bg-white/[0.04] transition-colors group">
                        <td className="py-4 text-zinc-500 text-sm font-medium w-8">
                          {index + 1}°
                        </td>
                        <td className="py-4">
                          <p className="text-zinc-200 text-sm font-medium flex items-center gap-2">
                            {index < 3 && <Crown className={`w-3 h-3 ${index === 0 ? 'text-amber-400' : index === 1 ? 'text-zinc-400' : 'text-amber-700'}`} />}
                            {client.name}
                          </p>
                        </td>
                        <td className="py-4 text-zinc-500 text-sm hidden sm:table-cell">
                          {client.firstDateDisplay.split(' ')[0]}
                        </td>
                        <td className="py-4 text-right">
                          <span className="text-amber-400/90 font-semibold text-sm">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.totalSpent)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-600 text-sm bg-white/[0.02] rounded-xl border border-dashed border-white/5">
                  Nenhum cliente registrado
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
