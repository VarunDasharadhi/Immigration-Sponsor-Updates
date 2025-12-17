import React, { useEffect, useState } from 'react';
import { fetchPetitions } from '../services/geminiService';
import { AIResponse, PetitionItem } from '../types';
import { ScrollText, TrendingUp, Users, ArrowUpRight, PenTool, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const PetitionTracker: React.FC = () => {
  const [data, setData] = useState<AIResponse | null>(null);
  const [parsedPetitions, setParsedPetitions] = useState<PetitionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Mock chart data - in a real app this could be dynamic
  const engagementData = [
    { name: 'Mon', signatures: 1240 },
    { name: 'Tue', signatures: 2100 },
    { name: 'Wed', signatures: 4500 },
    { name: 'Thu', signatures: 3200 },
    { name: 'Fri', signatures: 5100 },
    { name: 'Sat', signatures: 6800 },
    { name: 'Sun', signatures: 4300 },
  ];

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchPetitions();
        setData(result);
        
        // Parse the structured response
        const petitions: PetitionItem[] = [];
        const blocks = result.text.split('|PETITION_START|').slice(1);
        
        blocks.forEach((block, index) => {
          const cleanBlock = block.split('|PETITION_END|')[0];
          const lines = cleanBlock.split('\n').map(l => l.trim()).filter(Boolean);
          const item: any = {};
          
          lines.forEach(line => {
             const keyMatch = line.match(/^(TITLE|SUMMARY|SIGNATURES|STATUS):\s*(.*)/i);
             if (keyMatch) {
                 item[keyMatch[1].toUpperCase()] = keyMatch[2];
             }
          });

          if (item.TITLE) {
              petitions.push({
                  id: `pet-${index}`,
                  title: item.TITLE,
                  summary: item.SUMMARY || 'No summary available',
                  signatures: item.SIGNATURES || 'Trending',
                  status: item.STATUS || 'Open'
              });
          }
        });
        
        setParsedPetitions(petitions);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getProgressWidth = (signatures: string) => {
    // Extract number from string like "45,200"
    const num = parseInt(signatures.replace(/[^0-9]/g, '')) || 0;
    // Cap at 100k for the bar visual
    const percentage = Math.min((num / 100000) * 100, 100);
    // Ensure at least a little bit shows if < 1%
    return Math.max(percentage, 2);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8">
      <div className="mb-10 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
             <ScrollText className="w-3.5 h-3.5" />
             Parliament Live
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Active Petitions</h2>
        <p className="text-lg text-slate-500 mt-2 font-light">Track the public voice on immigration policy changes.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-12">
        {/* Engagement Chart (Spans 2 cols on large) */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">Signature Velocity</h3>
                    <p className="text-xs text-slate-400">Past 7 Days</p>
                </div>
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">27.2k</span>
          </div>
          
          <div className="h-64 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 500}} dy={10} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                />
                <Bar dataKey="signatures" radius={[6, 6, 6, 6]} barSize={32}>
                    {engagementData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 5 ? '#4f46e5' : '#e2e8f0'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl text-white flex flex-col justify-between shadow-xl shadow-indigo-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
                    <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Power in Numbers</h3>
                <p className="text-indigo-100 leading-relaxed font-light text-sm">
                    Petitions on the official parliament site force a response.
                </p>
                <div className="mt-6 space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">10k</div>
                         <p className="text-sm font-medium">Government Response</p>
                    </div>
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs">100k</div>
                         <p className="text-sm font-medium">Parliamentary Debate</p>
                    </div>
                </div>
            </div>
            <a 
                href="https://petition.parliament.uk/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="mt-8 inline-flex items-center justify-between w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm p-4 rounded-xl transition-all group"
            >
                <span className="font-semibold text-sm">Visit Official Site</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
        </div>
      </div>

      {/* Structured Petitions List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
             <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                Trending Right Now
            </h3>
            <span className="text-sm text-slate-500 hidden sm:block">Updated daily from UK Parliament data</span>
        </div>
        
        {loading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3].map(i => (
                    <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse border border-slate-200"></div>
                ))}
            </div>
        ) : parsedPetitions.length > 0 ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {parsedPetitions.map((petition) => (
                    <div key={petition.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:border-indigo-200 transition-all group flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border
                                ${petition.status.toLowerCase().includes('open') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                  petition.status.toLowerCase().includes('debate') ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                  'bg-slate-50 text-slate-600 border-slate-100'}`}>
                                {petition.status}
                            </span>
                            <PenTool className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                        </div>
                        
                        <h4 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-tight group-hover:text-indigo-700 transition-colors">
                            {petition.title}
                        </h4>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">
                            {petition.summary}
                        </p>

                        <div className="mt-auto">
                             <div className="flex justify-between items-end mb-2">
                                <div className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">Signatures</span>
                                    <span className="text-xl font-extrabold text-slate-800">{petition.signatures}</span>
                                </div>
                                {petition.signatures.includes(',') && (
                                     <div className="text-right">
                                        <span className="text-[10px] text-slate-400 block">Goal: 100k</span>
                                     </div>
                                )}
                             </div>
                             {/* Progress Bar */}
                             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${getProgressWidth(petition.signatures)}%` }}
                                ></div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            // Fallback for raw text if parsing fails entirely, though prompt is robust
            <div className="prose prose-slate max-w-none text-slate-600 bg-white p-8 rounded-2xl shadow-sm border border-slate-200 leading-relaxed">
                 <AlertCircle className="w-8 h-8 text-slate-300 mb-4" />
                 <p>{data?.text || "No trending petitions found at this time."}</p>
            </div>
        )}

        {/* Sources Footer */}
        {data?.sources && data.sources.length > 0 && (
             <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200/60">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sources:</span>
                {data.sources.filter(s => s.web).slice(0, 4).map((s, i) => (
                    <a 
                        key={i}
                        href={s.web?.uri} 
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium bg-white text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition shadow-sm"
                    >
                        {s.web?.title || 'External Link'}
                    </a>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};