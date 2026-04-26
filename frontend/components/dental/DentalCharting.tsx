import React, { useState } from 'react';
import { Info, HelpCircle } from 'lucide-react';

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

const legend = [
  { code: 'C', label: 'Caries' },
  { code: 'X', label: 'Extraction' },
  { code: 'AM', label: 'Amalgam' },
  { code: 'RCT', label: 'Root Canal' },
  { code: 'Ab', label: 'Abutment' },
  { code: 'P', label: 'Pontic' },
  { code: 'M', label: 'Missing' },
  { code: 'Un', label: 'Unerupted' },
  { code: 'PD', label: 'Partial Denture' },
  { code: 'JD', label: 'Full Denture' },
  { code: 'JC', label: 'Jacket Crown' },
  { code: 'FB', label: 'Fixed Bridge' },
  { code: 'CO', label: 'Composite' },
  { code: 'TF', label: 'Temp Filling' },
];

interface DentalChartingProps {
  chartData: any;
  onUpdate: (tooth: number, code: string) => void;
}

const DentalCharting: React.FC<DentalChartingProps> = ({ chartData, onUpdate }) => {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  const Tooth = ({ num }: { num: number }) => (
    <div 
      onClick={() => setSelectedTooth(num)}
      className={`relative w-12 h-16 sm:w-16 sm:h-20 border-2 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
        selectedTooth === num 
        ? 'border-emerald-600 bg-emerald-50 scale-110 z-10 shadow-lg' 
        : 'border-slate-100 bg-white hover:border-emerald-300'
      }`}
    >
      <span className="text-[10px] font-black text-slate-300 mb-2">{num}</span>
      <div className="w-8 h-8 sm:w-10 sm:h-10 border-2 border-slate-200 rounded-lg flex items-center justify-center font-black text-emerald-700 bg-white shadow-inner">
        {chartData[num] || ''}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Legend Box - Moved to Top */}
      <div className="bg-slate-900 p-6 sm:p-8 rounded-[2rem] text-white shadow-xl border border-slate-800">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <HelpCircle className="text-emerald-500" size={20} />
          </div>
          <h3 className="font-black uppercase tracking-widest text-xs">Charting Legend</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3 sm:gap-4">
          {legend.map(l => (
            <div key={l.code} className="flex items-center gap-3 group cursor-help bg-slate-800/50 rounded-2xl pr-4 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-800 transition-all">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-800 rounded-2xl flex items-center justify-center font-black text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:scale-105 transition-all shrink-0 shadow-inner">
                {l.code}
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 group-hover:text-white transition-colors tracking-wide leading-tight truncate">
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Info size={120} />
        </div>
        
        <div className="space-y-4 mb-8">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Visual Dental Charting</h3>
          <p className="text-xs font-bold text-slate-400">Click a tooth to log diseases, abnormalities, or restorations.</p>
        </div>

        {/* Upper Arch */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 text-blue-600">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Upper Arch (Maxilla)</span>
            <div className="h-px flex-1 bg-blue-50" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2 sm:gap-3 justify-items-center">
            {upperTeeth.map(n => <Tooth key={n} num={n} />)}
          </div>
        </div>

        {/* Lower Arch */}
        <div className="space-y-6 pt-8">
          <div className="flex items-center gap-3 text-rose-600">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Lower Arch (Mandible)</span>
            <div className="h-px flex-1 bg-rose-50" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-2 sm:gap-3 justify-items-center">
            {lowerTeeth.map(n => <Tooth key={n} num={n} />)}
          </div>
        </div>

        {/* Code Selector (Floating when tooth selected) */}
        {selectedTooth && (
          <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white animate-in slide-in-from-bottom-4 duration-300 shadow-2xl ring-4 ring-emerald-500/20">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-xl shadow-inner">
                  {selectedTooth}
                </div>
                <h4 className="font-bold">Select Condition for Tooth #{selectedTooth}</h4>
              </div>
              <button onClick={() => setSelectedTooth(null)} className="text-slate-400 hover:text-white font-bold p-2 hover:bg-slate-800 rounded-lg transition-colors">✕ Close</button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
              {legend.map(l => (
                <button
                  key={l.code}
                  onClick={() => {
                    onUpdate(selectedTooth, l.code);
                    setSelectedTooth(null);
                  }}
                  className={`p-3 rounded-xl text-xs font-black transition-all border-2 border-transparent ${
                    chartData[selectedTooth] === l.code 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {l.code}
                </button>
              ))}
              <button
                onClick={() => {
                  onUpdate(selectedTooth, '');
                  setSelectedTooth(null);
                }}
                className="p-3 rounded-xl text-xs font-black bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all col-span-2 border-2 border-transparent hover:border-rose-400 shadow-sm"
              >
                Clear Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DentalCharting;
