"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend 
} from 'recharts';
import { Scissors, Users, DollarSign, TrendingUp, Calendar, Clock, Star } from 'lucide-react';

const revenueData = [
  { name: 'Seg', revenue: 400, appointments: 8 },
  { name: 'Ter', revenue: 600, appointments: 12 },
  { name: 'Qua', revenue: 500, appointments: 10 },
  { name: 'Qui', revenue: 900, appointments: 18 },
  { name: 'Sex', revenue: 1500, appointments: 25 },
  { name: 'Sáb', revenue: 2200, appointments: 35 },
  { name: 'Dom', revenue: 1800, appointments: 28 },
];

const serviceData = [
  { name: 'Corte', count: 85 },
  { name: 'Barba', count: 60 },
  { name: 'Corte + Barba', count: 120 },
  { name: 'Sobrancelha', count: 30 },
  { name: 'Coloração', count: 15 },
];

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <nav className="bg-zinc-900 text-white p-4 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Scissors className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Barbearia Costeleta</h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="bg-zinc-800 px-3 py-1 rounded-full text-zinc-300">Admin</span>
          <img src="https://ui-avatars.com/api/?name=Admin&background=f59e0b&color=fff" alt="Admin" className="w-10 h-10 rounded-full border-2 border-amber-500" />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Visão Geral</h2>
            <p className="text-gray-500 mt-1">Acompanhe os dados da barbearia em tempo real</p>
          </div>
          <button className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm">
            <Calendar className="w-5 h-5" />
            Esta Semana
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-500 font-medium">Receita Bruta</h3>
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">R$ 7.900</div>
            <p className="text-sm text-green-600 mt-2 flex items-center font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +12.5% em relação à semana passada
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-500 font-medium">Agendamentos</h3>
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">136</div>
            <p className="text-sm text-blue-600 mt-2 flex items-center font-medium">
              <TrendingUp className="w-4 h-4 mr-1" /> +8 novos clientes
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-500 font-medium">Clientes Atendidos</h3>
              <div className="bg-amber-100 p-2 rounded-lg">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">112</div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Taxa de comparecimento: 82%
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-gray-500 font-medium">Avaliação Média</h3>
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600 fill-yellow-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">4.9</div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Baseado em 45 avaliações
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              Receita Semanal
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 14}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 14}} tickFormatter={(val) => `R$${val}`} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Line type="monotone" name="Receita (R$)" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 8}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Services Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-gray-400" />
              Serviços Mais Realizados
            </h3>
            <div className="h-80 w-full">
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
          </div>
        </div>
      </main>
    </div>
  );
}
