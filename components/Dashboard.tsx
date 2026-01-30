import React, { useEffect, useState } from 'react';
import { UserState, Patient } from '../types';
import { StorageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Coins, Award, Users, TrendingUp, UsersRound } from 'lucide-react';

interface DashboardProps {
  userState: UserState;
  userId?: string | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ userState, userId }) => {
  const [history, setHistory] = useState<Patient[]>([]);

  useEffect(() => {
    StorageService.getPatientHistory(userId).then(setHistory);
  }, [userState, userId]);

  // Prepare chart data: aggregate by ailment
  const dataMap = history.reduce((acc, curr) => {
    acc[curr.ailment] = (acc[curr.ailment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(dataMap)
    .map((key) => ({
      name: key.length > 20 ? key.substring(0, 17) + '...' : key,
      count: dataMap[key],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={`bg-white p-6 rounded-3xl shadow-sm border border-${color}-100 flex items-center space-x-4`}>
      <div className={`p-4 rounded-2xl bg-${color}-100 text-${color}-600`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-slate-500 font-medium text-sm uppercase tracking-wide">{label}</p>
        <h4 className="text-3xl font-bold text-slate-800">{value}</h4>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Visits" value={userState.patientsTreated} color="pink" />
        <StatCard icon={UsersRound} label="Active Panel" value={(userState.patientPanel || []).length} color="blue" />
        <StatCard icon={Coins} label="Star Bits" value={userState.currency} color="amber" />
        <StatCard icon={Award} label="Level" value={userState.level} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
             <ActivityIcon className="w-5 h-5 mr-2 text-pink-500"/> 
             Common Ailments Frequency
          </h3>
          <div className="h-72">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  layout="vertical" 
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    tick={{fontSize: 11, fontWeight: 600}} 
                    stroke="#94a3b8" 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#fdf2f8'}}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#f472b6', '#c084fc', '#2dd4bf', '#fbbf24', '#f87171', '#60a5fa'][index % 6]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                No data yet. Treat some patients!
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Recent Visits</h3>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
            {history.map((patient) => (
              <div key={patient.visitId || patient.timestamp} className="flex items-center space-x-4 p-3 hover:bg-pink-50 rounded-xl transition-colors">
                 <div className="relative">
                    <img src={patient.imageUrl} className="w-12 h-12 rounded-full object-cover border-2 border-pink-200" alt={patient.name}/>
                    {patient.visitCount && patient.visitCount > 1 && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border border-white text-[8px] flex items-center justify-center font-bold text-white shadow-sm">
                            {patient.visitCount}
                        </div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-bold truncate">{patient.name}</p>
                    <p className="text-slate-500 text-sm truncate">{patient.ailment}</p>
                 </div>
                 <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full shrink-0">
                    +{patient.reward}
                 </span>
              </div>
            ))}
            {history.length === 0 && (
               <div className="text-center text-slate-400 py-8">
                 Patient records will appear here.
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);