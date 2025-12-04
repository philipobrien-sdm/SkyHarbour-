import React, { useState, useMemo } from 'react';
import { GameState, TechUpgrade } from '../types';
import { generateAdvisorTip, generateAirlineNegotiation } from '../services/geminiService';
import { formatTime, getGameDate } from '../constants';
import { Coins, Users, Activity, Plane as PlaneIcon, MessageCircle, TrendingUp, Briefcase, ToggleLeft, ToggleRight, ChevronRight, ChevronLeft, Calendar, Clock, AlertCircle, Play, Pause } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
  gameState: GameState;
  onUpgrade: (id: string) => void;
  onInfluence: (type: 'tourism' | 'industry') => void;
  onClosePlane: () => void;
  addLog: (msg: string, type: any) => void;
  onToggleAi: () => void;
  onTogglePause: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ gameState, onUpgrade, onInfluence, onClosePlane, addLog, onToggleAi, onTogglePause }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tech' | 'economy' | 'schedule'>('overview');
  const [advisorTip, setAdvisorTip] = useState<string | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);
  const [negotiationOpen, setNegotiationOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState(20000);
  const [projectionYears, setProjectionYears] = useState(1);
  
  const [statsCollapsed, setStatsCollapsed] = useState(false);
  const [controlsCollapsed, setControlsCollapsed] = useState(false);

  const selectedPlane = gameState.planes.find(p => p.id === gameState.selectedPlaneId);

  const handleConsultAdvisor = async () => {
    setLoadingAdvisor(true);
    const tip = await generateAdvisorTip(gameState);
    setAdvisorTip(tip);
    setLoadingAdvisor(false);
  };

  const handleNegotiate = async () => {
    setLoadingAdvisor(true);
    const result = await generateAirlineNegotiation('GlobalAir', offerAmount, gameState);
    setLoadingAdvisor(false);
    if (result.accepted) {
        addLog(`Negotiation Success: ${result.message}`, 'success');
        onInfluence('tourism');
    } else {
        addLog(`Negotiation Failed: ${result.message}`, 'error');
    }
    setNegotiationOpen(false);
  };

  const handleTabClick = (tab: any) => {
      setActiveTab(tab);
      if (controlsCollapsed) setControlsCollapsed(false);
  };

  // Traffic Projection Logic
  const trafficData = useMemo(() => {
    const data = [];
    let currentDemand = gameState.economy.demand; // Base demand
    
    // Growth factor logic
    const unlockedUpgrades = gameState.upgrades.filter(u => u.unlocked).length;
    
    // Monthly growth Rate: 
    // Positive if Reputation > 50, accelerated by upgrades.
    // Negative if Reputation < 40.
    const monthlyGrowthBase = (gameState.economy.reputation - 50) / 400; // e.g., 80 rep -> +0.075 growth/month
    const infraBoost = unlockedUpgrades * 0.05; // 5% boost per upgrade
    const netGrowthRate = 1 + (monthlyGrowthBase + infraBoost) / 10; // Dampened

    const months = projectionYears * 12;
    const currentDate = getGameDate(gameState.gameTime);

    for (let i = 0; i < months; i++) {
        const monthOffset = (currentDate.monthIndex + i);
        const yearOffset = currentDate.year + Math.floor((monthOffset) / 12);
        const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthOffset % 12];
        const monthLabel = `${monthName} '${yearOffset.toString().slice(-2)}`;
        
        // Seasonality: Peak in Summer (Month 5-6), Dip in Winter (Month 0-1)
        // Sin Wave centered on Month 5 (June)
        const seasonality = 1 + 0.3 * Math.sin((monthOffset - 2) * Math.PI / 6);

        // Apply Growth
        currentDemand = currentDemand * netGrowthRate;
        
        // Final projected flights (Demand * Seasonality)
        const projected = Math.floor(currentDemand * 10 * seasonality);
        
        data.push({
            name: monthLabel,
            flights: Math.max(0, projected)
        });
    }
    return data;
  }, [gameState.economy.demand, gameState.economy.reputation, gameState.gameTime, projectionYears, gameState.upgrades]);

  const activeFlights = gameState.planes.length;
  const waitingFlights = gameState.planes.filter(p => p.status === 'WAITING_FOR_GATE' || p.status === 'HOLD_SHORT').length;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-4 z-[90]">
      {/* Top Bar: Stats & Clock */}
      <div className={`pointer-events-auto flex flex-col md:flex-row justify-between items-start gap-2 transition-all duration-300 ${statsCollapsed ? 'w-auto' : 'w-full'}`}>
        
        <div className={`bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-200 transition-all duration-300 flex items-center overflow-hidden
             ${statsCollapsed ? 'p-2 w-auto' : 'p-2 md:p-4 w-full md:w-auto overflow-x-auto'}`}>
            
            <button 
                onClick={() => setStatsCollapsed(!statsCollapsed)}
                className="mr-2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
                {statsCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {statsCollapsed ? (
                <div className="flex items-center gap-2">
                     <Coins className="text-yellow-500 w-4 h-4" />
                     <span className="font-mono font-bold text-sm">${gameState.economy.balance.toLocaleString()}</span>
                </div>
            ) : (
                <div className="flex gap-4 md:gap-8 text-slate-700 min-w-max items-center">
                    {/* CLOCK & CONTROLS */}
                    <div className="flex items-center gap-3 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                        <Clock size={16} className="text-slate-500" />
                        <span className="font-mono font-bold text-lg text-slate-800 w-24">{formatTime(gameState.gameTime).split(' ')[0]}</span>
                        <div className="w-px h-4 bg-slate-300 mx-1" />
                        
                        <div className="flex items-center gap-1">
                            <button onClick={onTogglePause} className={`p-1 rounded hover:bg-slate-200 ${gameState.paused ? 'text-red-500' : 'text-slate-600'}`}>
                                {gameState.paused ? <Play size={14} fill="currentColor" /> : <Pause size={14} fill="currentColor" />}
                            </button>
                        </div>
                    </div>

                    <div className="w-px bg-slate-200 h-8" />

                    <div className="flex items-center gap-2">
                        <Coins className="text-yellow-500 w-5 h-5" />
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Balance</div>
                            <div className="font-mono font-bold text-lg">${gameState.economy.balance.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="text-blue-500 w-5 h-5" />
                        <div>
                            <div className="text-[10px] uppercase font-bold text-slate-400">Reputation</div>
                            <div className="font-mono font-bold text-lg">{gameState.economy.reputation}</div>
                        </div>
                    </div>
                    
                    {/* Alert for congestion */}
                    {waitingFlights > 2 && (
                         <div className="flex items-center gap-1 text-red-600 animate-pulse">
                             <AlertCircle size={16} />
                             <span className="text-xs font-bold">CONGESTION</span>
                         </div>
                    )}
                </div>
            )}
        </div>

        {/* Logs */}
        {!statsCollapsed && (
            <div className="hidden md:flex w-80 h-32 overflow-hidden flex-col gap-1 items-end opacity-90 pointer-events-none">
                {gameState.logs.slice(0, 5).map(log => (
                    <div key={log.id} className={`text-xs px-2 py-1 rounded shadow-sm text-white backdrop-blur-sm
                        ${log.type === 'error' ? 'bg-red-500/90' : log.type === 'success' ? 'bg-green-500/90' : 'bg-slate-800/80'}`}>
                        {log.message}
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Selected Plane Panel */}
      {selectedPlane && (
          <div className="absolute top-24 left-2 right-2 md:right-auto md:top-20 md:left-4 md:w-72 bg-white/95 backdrop-blur rounded-lg shadow-2xl border border-slate-200 p-4 pointer-events-auto animate-in slide-in-from-left z-20">
              <div className="flex justify-between items-center mb-2 pb-2 border-b">
                  <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      {selectedPlane.flightNumber}
                  </h3>
                  <button onClick={onClosePlane} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
              </div>
              <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between"><span>Airline:</span> <span className="font-bold">{selectedPlane.airline}</span></div>
                  <div className="flex justify-between">
                      <span>Status:</span> 
                      <span className={`font-mono px-1 rounded text-xs font-bold 
                        ${selectedPlane.status === 'GO_AROUND' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                        {selectedPlane.status}
                      </span>
                  </div>
                  <div className="flex justify-between"><span>Gate:</span> <span>{selectedPlane.targetGateId ? selectedPlane.targetGateId.toUpperCase() : 'Not Assigned'}</span></div>
                  <div className="flex justify-between"><span>Pax:</span> <span>{selectedPlane.passengers}</span></div>
              </div>
          </div>
      )}

      {/* Bottom Control Deck */}
      <div 
        className={`pointer-events-auto bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] rounded-t-3xl w-full flex flex-col md:flex-row transition-all duration-300
        ${controlsCollapsed ? 'h-16 md:h-auto md:w-16 md:rounded-r-xl md:rounded-tl-none md:border-r md:border-t-0 p-2' : 'p-4 md:p-6 gap-4 md:gap-8 max-h-[50vh] md:max-h-80'}
        `}
      >
        <div className="md:hidden w-full flex justify-center pb-2" onClick={() => setControlsCollapsed(!controlsCollapsed)}>
            <div className="w-12 h-1 bg-slate-300 rounded-full" />
        </div>

        {/* Tabs */}
        <div className={`flex flex-row md:flex-col gap-2 border-b md:border-b-0 md:border-r pb-2 md:pb-0 md:pr-6 border-slate-200 overflow-x-auto shrink-0 ${controlsCollapsed ? 'md:items-center md:border-none md:p-0' : ''}`}>
             <button 
                onClick={() => setControlsCollapsed(!controlsCollapsed)}
                className="hidden md:flex mb-2 p-2 hover:bg-slate-100 rounded-lg justify-center text-slate-400"
            >
                 {controlsCollapsed ? <ChevronRight /> : <ChevronLeft />}
            </button>

            <button 
                onClick={() => handleTabClick('overview')}
                className={`p-2 md:p-3 rounded-xl flex items-center gap-2 font-bold transition-all whitespace-nowrap text-sm md:text-base 
                    ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Activity size={18} /> 
                {!controlsCollapsed && "Overview"}
            </button>
            <button 
                onClick={() => handleTabClick('schedule')}
                className={`p-2 md:p-3 rounded-xl flex items-center gap-2 font-bold transition-all whitespace-nowrap text-sm md:text-base 
                    ${activeTab === 'schedule' ? 'bg-violet-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Calendar size={18} /> 
                {!controlsCollapsed && "Schedule"}
            </button>
            <button 
                onClick={() => handleTabClick('tech')}
                className={`p-2 md:p-3 rounded-xl flex items-center gap-2 font-bold transition-all whitespace-nowrap text-sm md:text-base 
                    ${activeTab === 'tech' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}>
                <TrendingUp size={18} /> 
                {!controlsCollapsed && "Upgrades"}
            </button>
            <button 
                onClick={() => handleTabClick('economy')}
                className={`p-2 md:p-3 rounded-xl flex items-center gap-2 font-bold transition-all whitespace-nowrap text-sm md:text-base 
                    ${activeTab === 'economy' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-500'}`}>
                <Briefcase size={18} /> 
                {!controlsCollapsed && "Economy"}
            </button>
        </div>

        {/* Panel Content */}
        {!controlsCollapsed && (
        <div className="flex-1 overflow-y-auto pr-2 pb-safe animate-in fade-in duration-300">
            
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-bold text-slate-500 uppercase">System Advisor</h4>
                                <button 
                                    onClick={onToggleAi}
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-colors
                                    ${gameState.aiEnabled ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-slate-200 text-slate-500 border-slate-300'}`}
                                >
                                    {gameState.aiEnabled ? 'AI ACTIVE' : 'MANUAL'}
                                </button>
                            </div>
                            <p className="text-slate-800 text-sm italic min-h-[40px]">"{advisorTip || 'Operations nominal. Check schedule for incoming peaks.'}"</p>
                            <button 
                                onClick={handleConsultAdvisor}
                                className="mt-3 text-xs bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg font-bold hover:bg-indigo-200 flex items-center gap-2 w-full justify-center md:w-auto">
                                <MessageCircle size={14} /> Analyze Data
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-col h-full min-h-[200px]">
                         <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-bold text-slate-500 uppercase">Projected Traffic (Seasonal)</h4>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">{projectionYears}Y</span>
                                <input 
                                    type="range" min="1" max="5" step="1" 
                                    value={projectionYears} 
                                    onChange={(e) => setProjectionYears(Number(e.target.value))}
                                    className="w-20 accent-indigo-600"
                                />
                            </div>
                         </div>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={trafficData}>
                                    <defs>
                                        <linearGradient id="colorFlights" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" hide={projectionYears > 2} style={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#64748b' }}
                                    />
                                    <Area type="monotone" dataKey="flights" stroke="#8884d8" fillOpacity={1} fill="url(#colorFlights)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'schedule' && (
                <div>
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Flight Board</h4>
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-2">Flight</th>
                                    <th className="px-4 py-2">Time</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {gameState.schedule.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">No flights scheduled.</td></tr>}
                                {gameState.schedule.map(flight => (
                                    <tr key={flight.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-bold text-slate-700">{flight.flightNumber}</td>
                                        <td className="px-4 py-2 font-mono text-slate-500">{formatTime(flight.scheduledTime).split(' ')[3]}</td>
                                        <td className="px-4 py-2 capitalize">{flight.type}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold
                                                ${flight.status === 'On Time' || flight.status === 'Scheduled' ? 'bg-green-100 text-green-700' : 
                                                  flight.status === 'Delayed' ? 'bg-yellow-100 text-yellow-700' :
                                                  flight.status === 'Diverted' || flight.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {flight.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'tech' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {gameState.upgrades.map(u => (
                        <button 
                            key={u.id}
                            disabled={u.unlocked || gameState.economy.balance < u.cost}
                            onClick={() => onUpgrade(u.id)}
                            className={`text-left p-3 rounded-lg border flex flex-col gap-1 transition-all
                                ${u.unlocked ? 'bg-green-50 border-green-200 opacity-70' : 
                                  gameState.economy.balance < u.cost ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-blue-200 hover:border-blue-500 hover:shadow-md'}
                            `}
                        >
                            <div className="flex justify-between w-full">
                                <span className="font-bold text-sm text-slate-800">{u.name}</span>
                                {u.unlocked ? <span className="text-xs text-green-600 font-bold">OWNED</span> : <span className="text-xs font-mono text-slate-500">${u.cost.toLocaleString()}</span>}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2">{u.description}</p>
                        </button>
                    ))}
                </div>
            )}

            {activeTab === 'economy' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-3">
                        <h4 className="font-bold text-slate-700">Campaigns</h4>
                        <button onClick={() => onInfluence('tourism')} className="w-full text-left bg-emerald-50 hover:bg-emerald-100 p-3 rounded-lg border border-emerald-100 flex justify-between items-center group">
                            <div>
                                <div className="font-bold text-emerald-800">Visit SkyHarbor</div>
                                <div className="text-xs text-emerald-600">Boost Tourism (+Demand)</div>
                            </div>
                            <span className="font-mono text-emerald-700 font-bold">$25,000</span>
                        </button>
                        <button onClick={() => onInfluence('industry')} className="w-full text-left bg-blue-50 hover:bg-blue-100 p-3 rounded-lg border border-blue-100 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-blue-800">Logistics Hub</div>
                                <div className="text-xs text-blue-600">Boost Industry (+Cargo)</div>
                            </div>
                            <span className="font-mono text-blue-700 font-bold">$25,000</span>
                        </button>
                     </div>

                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h4 className="font-bold text-slate-700 mb-2">Airline Negotiations</h4>
                        {!negotiationOpen ? (
                            <button onClick={() => setNegotiationOpen(true)} className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Start Negotiation</button>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">Offer incentives to attract new routes.</div>
                                <input 
                                    type="range" min="10000" max="100000" step="5000" 
                                    value={offerAmount} onChange={(e) => setOfferAmount(Number(e.target.value))}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-sm font-bold">
                                    <span>Offer:</span>
                                    <span>${offerAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleNegotiate} disabled={loadingAdvisor} className="flex-1 bg-blue-600 text-white py-1 rounded text-sm font-bold">
                                        {loadingAdvisor ? '...' : 'Send Offer'}
                                    </button>
                                    <button onClick={() => setNegotiationOpen(false)} className="px-3 bg-slate-200 rounded text-sm font-bold">Cancel</button>
                                </div>
                            </div>
                        )}
                     </div>
                </div>
            )}
        </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
