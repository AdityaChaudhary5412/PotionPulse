import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Sparkles, Moon, AlertTriangle, Skull, Plus, RefreshCw, 
  Search, ArrowDownRight, ArrowUpRight, CheckCircle2, TrendingUp, 
  BarChart3, Boxes, Package, ShieldAlert, Smartphone
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, 
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';

// Automatically points to backend on port 8000 (localhost or mobile LAN IP)
const API_BASE = window.location.port === '3000' 
  ? `http://${window.location.hostname}:8000` 
  : window.location.origin;

export default function App() {
  const [items, setItems] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [curseState, setCurseState] = useState({ active: false });
  const [activeTab, setActiveTab] = useState('shelves');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '', category: 'Animal Parts', current_stock: 20, unit: 'units', reorder_threshold: 15, base_daily_demand: 4
  });

  const showToast = (msg, isErr = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = async () => {
    try {
      const [it, an, tx, cu] = await Promise.all([
        axios.get(`${API_BASE}/items`),
        axios.get(`${API_BASE}/api/anomalies`),
        axios.get(`${API_BASE}/transactions`),
        axios.get(`${API_BASE}/midnight-curse`)
      ]);
      setItems(it.data);
      setAnomalies(an.data);
      setTransactions(tx.data);
      setCurseState(cu.data);
    } catch (err) {
      console.error(err);
      showToast("Cannot connect to PotionPulse backend. Run 'backend/main.py' on port 8000.", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleCurse = async () => {
    try {
      const res = await axios.post(`${API_BASE}/midnight-curse/toggle`);
      setCurseState(res.data);
      showToast(res.data.active ? "🌕 Midnight Curse Unleashed! (+300% Demand Spike)" : "🌙 Midnight Curse Lifted.");
      fetchAll();
    } catch (e) {
      showToast("Curse toggle failed", true);
    }
  };

  const handleQuickSale = async (id, name) => {
    try {
      await axios.put(`${API_BASE}/items/${id}/stock`, { change_amount: -1, tx_type: 'sale', notes: 'Quick Sale (-1)' });
      showToast(`1 ${name} dispensed!`);
      fetchAll();
    } catch (e) {
      showToast("Sale failed", true);
    }
  };

  const handleQuickRestock = async (id, name) => {
    try {
      await axios.put(`${API_BASE}/items/${id}/stock`, { change_amount: 10, tx_type: 'restock', notes: 'Quick Restock (+10)' });
      showToast(`+10 ${name} restocked to pantry!`);
      fetchAll();
    } catch (e) {
      showToast("Restock failed", true);
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/items`, newItem);
      showToast(`New reagent ${newItem.name} registered!`);
      setNewModalOpen(false);
      setNewItem({ name: '', category: 'Animal Parts', current_stock: 20, unit: 'units', reorder_threshold: 15, base_daily_demand: 4 });
      fetchAll();
    } catch (e) {
      showToast(e.response?.data?.detail || "Creation failed", true);
    }
  };

  const handleReseed = async () => {
    try {
      await axios.post(`${API_BASE}/seed`);
      showToast("Pantry reseeded with 8 reagents & 14-day history!");
      fetchAll();
    } catch (e) {
      showToast("Reseed failed", true);
    }
  };

  const categories = ['All', ...new Set(items.map(i => i.category))];

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchCat = category === 'All' || i.category === category;
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [items, category, search]);

  const endangeredCount = items.filter(i => i.status === 'CRITICAL' || i.status === 'OUT_OF_STOCK').length;

  // Chart preparation: Depletion & Burn curve
  const chartData = useMemo(() => {
    return items.map(i => ({
      name: i.name.split(' ')[0],
      stock: i.current_stock,
      demand: i.daily_demand,
      days: i.days_until_stockout,
      reorder: i.recommended_reorder
    }));
  }, [items]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 flex flex-col font-sans">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-2xl flex items-center gap-2 border ${toast.isErr ? 'bg-red-950/90 border-red-500 text-red-200' : 'bg-emerald-950/90 border-emerald-500 text-emerald-200'} backdrop-blur-md animate-bounce`}>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* 1. MIDNIGHT CURSE ALERT BANNER */}
      <div className={`w-full px-4 py-2.5 transition-all duration-500 flex flex-wrap items-center justify-between gap-3 border-b text-xs sm:text-sm font-medium ${
        curseState.active 
          ? 'bg-gradient-to-r from-red-950 via-purple-950 to-red-950 border-red-600/50 shadow-[0_0_20px_rgba(239,68,68,0.25)]' 
          : 'bg-[#121624] border-purple-900/30 text-gray-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <Moon className={`w-4 h-4 ${curseState.active ? 'text-red-400 animate-pulse' : 'text-amber-400'}`} />
          <span>
            {curseState.active ? (
              <strong className="text-red-400">MIDNIGHT CURSE ACTIVE: 3x Demand Surge on Bat Wings, Mandrake Root & Ghost Pepper!</strong>
            ) : (
              <span>The village is calm. Midnight Curse inactive. Reagent demand normal.</span>
            )}
          </span>
        </div>
        <button
          onClick={handleToggleCurse}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
            curseState.active 
              ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30' 
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          {curseState.active ? 'Lift Midnight Curse' : 'Trigger Full Moon Festival (+300% Spike)'}
        </button>
      </div>

      {/* 2. TOP HEADER */}
      <header className="border-b border-white/5 bg-[#0B0F19]/80 backdrop-blur-xl sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(147,51,234,0.3)]">
            🧙‍♀️
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg tracking-tight bg-gradient-to-r from-purple-400 to-emerald-400 bg-clip-text text-transparent">
              PotionPulse
            </h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">Madam Hexley's Smart Demand Engine</p>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-xs font-mono">
          <div className="px-3 py-1 rounded-full bg-purple-950/40 border border-purple-700/30 text-purple-300 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            <span>{items.length} Items</span>
          </div>
          <div className={`px-3 py-1 rounded-full border flex items-center gap-1.5 ${endangeredCount > 0 ? 'bg-red-950/40 border-red-500/40 text-red-300' : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{endangeredCount} Endangered</span>
          </div>
          <div className="px-3 py-1 rounded-full bg-amber-950/40 border border-amber-600/30 text-amber-300 flex items-center gap-1.5">
            <Skull className="w-3.5 h-3.5" />
            <span>{anomalies.length} Anomalies</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleReseed}
            className="px-3 py-1.5 rounded-lg border border-purple-900/40 hover:bg-purple-950/40 text-xs text-gray-300 flex items-center gap-1.5"
            title="Seed Initial Hackathon Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reseed</span>
          </button>
          <button 
            onClick={() => setNewModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <Plus className="w-4 h-4" />
            <span>New Reagent</span>
          </button>
        </div>
      </header>

      {/* 3. NAVIGATION TABS */}
      <div className="border-b border-white/5 bg-[#0e1322] px-4 sm:px-8 flex gap-2 sm:gap-6 overflow-x-auto text-xs sm:text-sm font-medium">
        <button
          onClick={() => setActiveTab('shelves')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'shelves' 
              ? 'border-emerald-500 text-emerald-400 font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Boxes className="w-4 h-4" /> Pantry Shelves
        </button>
        <button
          onClick={() => setActiveTab('crystal-ball')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'crystal-ball' 
              ? 'border-purple-500 text-purple-400 font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Crystal Ball Prophecy
        </button>
        <button
          onClick={() => setActiveTab('anomalies')}
          className={`py-3 border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'anomalies' 
              ? 'border-red-500 text-red-400 font-bold' 
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Skull className="w-4 h-4" /> Strange Happenings ({anomalies.length})
        </button>
      </div>

      {/* 4. MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8">
        
        {/* TAB 1: PANTRY SHELVES */}
        {activeTab === 'shelves' && (
          <div className="space-y-6">
            
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search reagents, herbs, wings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#121624] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      category === cat 
                        ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(147,51,234,0.4)]' 
                        : 'bg-[#121624] border border-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => {
                const isCritical = item.status === 'CRITICAL' || item.status === 'OUT_OF_STOCK';
                const isLow = item.status === 'LOW_STOCK';
                
                return (
                  <div 
                    key={item.item_id}
                    className={`p-5 rounded-2xl bg-[#121624] border transition-all duration-300 relative flex flex-col justify-between hover:shadow-xl ${
                      item.is_cursed 
                        ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] bg-gradient-to-b from-red-950/20 to-[#121624]' 
                        : isCritical 
                          ? 'border-red-500/30' 
                          : 'border-white/5 hover:border-purple-500/40'
                    }`}
                  >
                    {item.is_cursed && (
                      <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                        <Moon className="w-3 h-3" /> 3x Cursed
                      </span>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-bold text-white text-base">{item.name}</h3>
                          <span className="text-[11px] font-mono text-gray-400 uppercase">{item.category}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isCritical ? 'bg-red-950 text-red-300 border border-red-500/40' :
                          isLow ? 'bg-amber-950 text-amber-300 border border-amber-500/40' :
                          'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Stock Level Display */}
                      <div className="my-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-2xl font-black text-white">{item.current_stock}</span>
                          <span className="text-xs text-gray-400 font-mono">{item.unit}</span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, (item.current_stock / (item.daily_demand * 10)) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Prophecy Details */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-black/30 p-2.5 rounded-xl border border-white/5 my-3">
                        <div>
                          <span className="text-gray-500 block">Daily Burn</span>
                          <span className="text-gray-200 font-bold">{item.daily_demand} / day</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Stockout In</span>
                          <span className={`font-bold ${item.days_until_stockout <= 2 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {item.days_until_stockout} Days
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-white/5 flex justify-between">
                          <span className="text-gray-500">Order Rec:</span>
                          <span className="text-purple-300 font-bold">+{item.recommended_reorder} {item.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons (Web & Android APK optimized) */}
                    <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5">
                      <button
                        onClick={() => handleQuickSale(item.item_id, item.name)}
                        className="py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <ArrowDownRight className="w-3.5 h-3.5" /> Sale (-1)
                      </button>
                      <button
                        onClick={() => handleQuickRestock(item.item_id, item.name)}
                        className="py-1.5 px-2 rounded-lg bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition-all flex items-center justify-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Stock (+10)
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 2: CRYSTAL BALL PROPHECY ANALYTICS */}
        {activeTab === 'crystal-ball' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Current Stock vs Reorder Recommendation */}
              <div className="p-5 rounded-2xl bg-[#121624] border border-white/5">
                <h3 className="font-bold text-sm text-gray-200 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" /> Stock Level vs Recommended Reorder Quantity
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222738" />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #333', borderRadius: '8px' }} />
                      <Bar dataKey="stock" fill="#10B981" name="Current Stock" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="reorder" fill="#9333EA" name="Restock Needed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Daily Burn & Days to Depletion */}
              <div className="p-5 rounded-2xl bg-[#121624] border border-white/5">
                <h3 className="font-bold text-sm text-gray-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Days Remaining Before Depletion
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222738" />
                      <XAxis dataKey="name" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#0B0F19', border: '1px solid #333', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="days" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} name="Days of Stock" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Smart Reorder Table */}
            <div className="p-5 rounded-2xl bg-[#121624] border border-white/5 overflow-x-auto">
              <h3 className="font-bold text-sm text-gray-200 mb-3">Automated Restock Forecast Manifest</h3>
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400">
                    <th className="py-2.5">Reagent</th>
                    <th>Current Stock</th>
                    <th>Daily Burn</th>
                    <th>Days Left</th>
                    <th>Restock Recommendation</th>
                    <th>Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map(i => (
                    <tr key={i.item_id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-bold text-white">{i.name}</td>
                      <td>{i.current_stock} {i.unit}</td>
                      <td>{i.daily_demand}/day</td>
                      <td className={i.days_until_stockout <= 2 ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                        {i.days_until_stockout}d
                      </td>
                      <td className="text-purple-300 font-bold">+{i.recommended_reorder} {i.unit}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          i.status === 'CRITICAL' ? 'bg-red-950 text-red-300' :
                          i.status === 'LOW_STOCK' ? 'bg-amber-950 text-amber-300' : 'bg-emerald-950 text-emerald-300'
                        }`}>
                          {i.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB 3: STRANGE HAPPENINGS ANOMALY RADAR */}
        {activeTab === 'anomalies' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-400" />
              <span>Statistical Z-Score Detector flags consumption spikes exceeding 2.5 standard deviations from historical baselines.</span>
            </div>

            <div className="space-y-3">
              {anomalies.map(a => (
                <div 
                  key={a.id}
                  className="p-4 rounded-xl bg-[#121624] border border-red-500/20 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <Skull className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{a.description}</h4>
                      <span className="text-[10px] font-mono text-gray-500">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                    a.severity === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-500/40' : 'bg-amber-950 text-amber-400'
                  }`}>
                    {a.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* 5. ADD ITEM MODAL */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Add Magical Reagent</h2>
            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-400 block mb-1">Reagent Name</label>
                <input 
                  required
                  type="text" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                  placeholder="e.g. Phoenix Ash"
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-400 block mb-1">Category</label>
                  <select 
                    value={newItem.category} 
                    onChange={e => setNewItem({...newItem, category: e.target.value})} 
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white"
                  >
                    <option>Animal Parts</option>
                    <option>Minerals</option>
                    <option>Roots</option>
                    <option>Spices</option>
                    <option>Elixirs</option>
                    <option>Rare Curios</option>
                  </select>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Unit of Measure</label>
                  <input 
                    type="text" 
                    value={newItem.unit} 
                    onChange={e => setNewItem({...newItem, unit: e.target.value})} 
                    placeholder="e.g. vials, pairs"
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-gray-400 block mb-1">Stock</label>
                  <input 
                    type="number" 
                    value={newItem.current_stock} 
                    onChange={e => setNewItem({...newItem, current_stock: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Reorder Alert</label>
                  <input 
                    type="number" 
                    value={newItem.reorder_threshold} 
                    onChange={e => setNewItem({...newItem, reorder_threshold: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Daily Demand</label>
                  <input 
                    type="number" 
                    value={newItem.base_daily_demand} 
                    onChange={e => setNewItem({...newItem, base_daily_demand: parseFloat(e.target.value) || 0})} 
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg p-2.5 text-white" 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500"
                >
                  Save Reagent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

