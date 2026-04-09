"use client";

import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend 
} from 'recharts';
import { Scissors, Users, DollarSign, TrendingUp, Calendar, Loader2, Info } from 'lucide-react';
import Papa from 'papaparse';

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1GmYrrCJWdc2kLGNxEdTJSsdZ-6H8Y_md9GsK5svSjlo/export?format=csv&gid=545750877";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    revenue: 0,
    appointments: 0,
    uniqueClients: 0
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [serviceData, setServiceData] = useState<any[]>([]);

  useEffect(() => {
    fetch(SHEET_URL)
      .then(res => res.text())
      .then(csvText => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            processData(results.data);
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

  const processData = (data: any[]) => {
    if (!data || data.length === 0) return;

    let totalRevenue = 0;
    const namesSet = new Set();
    const servicesMap: Record<string, number> = {};
    const revenueByDayMap: Record<string, number> = {};

    data.forEach(row => {
      // Valor
      const valorRaw = row['VALOR:'] || '0';
      const valorClean = valorRaw.toString().replace(/[R$\s]/g, '').replace('.', '').replace(',', '.');
      const valor = parseFloat(valorClean) || 0;
      totalRevenue += valor;

      // Clientes únicos
      const nome = row['NOME:'];
      if (nome && nome.trim() !== '') {
        namesSet.add(nome.trim().toLowerCase());
      }

      // Serviços
      const servicosRaw = row['SERVIÇOS:'];
      if (servicosRaw && servicosRaw.trim() !== '') {
        // Assume que os serviços podem vir separados por vírgula ou +
        const splitServicos = servicosRaw.split(/[,+]/).map((s: string) => s.trim()).filter(Boolean);
        splitServicos.forEach((s: string) => {
          servicesMap[s] = (servicesMap[s] || 0) + 1;
        });
      }

      // Agrupamento por dia (simplificado para demonstração caso haja data, caso não cria data genérica)
      const dataRaw = row['DATA / AGENDAMENTO:'];
      if (dataRaw && dataRaw.trim() !== '') {
        // Pega só o dia ou mantém a string caso o formato não seja padronizado
        const dateKey = dataRaw.split(' ')[0] || dataRaw;
        revenueByDayMap[dateKey] = (revenueByDayMap[dateKey] || 0) + valor;
      }
    });

    setMetrics({
      revenue: totalRevenue,
      appointments: data.length,
      uniqueClients: namesSet.size
    });

    // Formata Top Serviços
    const parsedServices = Object.entries(servicesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5
    
    setServiceData(parsedServices.length > 0 ? parsedServices : []);

    // Formata Receita por Dia
    const parsedRevenueByDay = Object.entries(revenueByDayMap)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Se não há dados, fica vazio
    setRevenueData(parsedRevenueByDay.length > 0 ? parsedRevenueByDay : []);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <nav className="bg-zinc-900 text-white p-4 shadow-lg flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <Scissors className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Barbearia Costeleta</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <a href="https://docs.google.com/spreadsheets/d/1GmYrrCJWdc2kLGNxEdTJSsdZ-6H8Y_md9GsK5svSjlo/edit#gid=545750877" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors underline underline-offset-4 mr-2">Ver Planilha</a>
          <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">Admin</span>
          <img src="https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff" alt="Admin" className="w-10 h-10 rounded-full border-2 border-amber-500" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full flex-grow">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Visão Geral</h2>
            <p className="text-gray-500 mt-1">Acompanhe os dados reais da sua planilha</p>
          </div>
          <button onClick={() => window.location.reload()} className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <TrendingUp className="w-5 h-5" />
            Atualizar Dados
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-10 h-10 animate-spin text-amber-500 mb-4" />
            <p className="text-lg font-medium">Sincronizando com a Planilha Google...</p>
          </div>
        ) : (
          <>
            {metrics.appointments === 0 && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 mb-8 flex items-center gap-3">
                <Info className="w-6 h-6 text-blue-500 flex-shrink-0" />
                <p><strong>Ainda não há dados:</strong> A sua planilha está vazia. Assim que você começar a adicionar novos clientes e agendamentos lá, este painel e os gráficos gerarão os relatórios automaticamente!</p>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-gray-500 font-medium">Receita Bruta Total</h3>
                  <div className="bg-green-100 p-2 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.revenue)}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-gray-500 font-medium">Agendamentos Totais</h3>
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800">{metrics.appointments}</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-gray-500 font-medium">Clientes Únicos</h3>
                  <div className="bg-amber-100 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-800">{metrics.uniqueClients}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Revenue Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-96">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  Receita por Data
                </h3>
                {revenueData.length > 0 ? (
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 14}} tickFormatter={(val) => `R$${val}`} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                        <Line type="monotone" name="Receita (R$)" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 8}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Nenhum dado financeiro para exibir ainda.
                  </div>
                )}
              </div>

              {/* Services Chart */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-96">
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-gray-400" />
                  Serviços Mais Realizados
                </h3>
                {serviceData.length > 0 ? (
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={serviceData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 14}} />
                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#4b5563', fontSize: 13, fontWeight: 500}} width={100} />
                        <RechartsTooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="count" name="Quantidade" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    Nenhum serviço registrado para exibir ainda.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
