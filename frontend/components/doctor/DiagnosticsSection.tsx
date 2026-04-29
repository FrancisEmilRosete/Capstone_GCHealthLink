'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Plus, History } from 'lucide-react';
import RecordHistoryModal from './RecordHistoryModal';

interface DiagnosticsSectionProps {
  data: {
    chestXray: string;
    laboratoryTest: string;
    others: string;
  };
  onChange: (field: string, value: string) => void;
}

interface SelectedFile {
  name: string;
  url: string;
  type: string;
}

const DiagnosticsSection: React.FC<DiagnosticsSectionProps> = ({ data, onChange }) => {
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const labInputRef = useRef<HTMLInputElement | null>(null);
  const [scanFile, setScanFile] = useState<SelectedFile | null>(null);
  const [labFile, setLabFile] = useState<SelectedFile | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  // PHASE 4: Structured data fields for CBC
  const [cbcData, setCbcData] = useState({
    cbcDate: '',
    hgb: '',
    hct: '',
    wbc: '',
    pltCt: '',
    bldType: '',
  });

  // PHASE 4: Structured data fields for U/A
  const [uaData, setUaData] = useState({
    uaDate: '',
    glucoseSugar: '',
    protein: '',
  });

  const mockHistory = [
    {
      timestamp: new Date().toISOString(),
      staffName: 'Dr. Smith',
      changes: ['CBC results updated', 'Chest X-Ray findings recorded'],
      version: 2,
    },
    {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      staffName: 'Dr. Johnson',
      changes: ['Initial lab work requested'],
      version: 1,
    },
  ];

  useEffect(() => {
    return () => {
      if (scanFile) URL.revokeObjectURL(scanFile.url);
      if (labFile) URL.revokeObjectURL(labFile.url);
    };
  }, [scanFile, labFile]);

  const appendAttachment = (current: string, label: string) => {
    const trimmed = current.trim();
    return trimmed ? `${trimmed}\n${label}` : label;
  };

  const handleSelectScan = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (scanFile) URL.revokeObjectURL(scanFile.url);
    setScanFile({ name: file.name, url, type: file.type });
    onChange('chestXray', appendAttachment(data.chestXray, `Attachment: ${file.name}`));
    event.target.value = '';
  };

  const handleSelectLab = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (labFile) URL.revokeObjectURL(labFile.url);
    setLabFile({ name: file.name, url, type: file.type });
    onChange('laboratoryTest', appendAttachment(data.laboratoryTest, `Lab Result File: ${file.name}`));
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Diagnostic & Lab Section</h2>
          {/* PHASE 5: Last Updated Indicator */}
          <div className="text-xs text-slate-400 italic mt-2">
            Last Updated: {new Date().toLocaleDateString()} by Current Staff
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <History size={16} /> History
        </button>
      </div>
      
      {/* PHASE 4: Chest X-Ray Structured Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ImageIcon size={18} className="text-blue-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chest X-Ray</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
              <input 
                type="date"
                value={data.chestXray.split('Date:')[1]?.split('\n')[0]?.trim() || ''}
                onChange={(e) => onChange('chestXray', `Date: ${e.target.value}`)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Result</label>
              <select
                onChange={(e) => onChange('chestXray', `Result: ${e.target.value}`)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option>Select result</option>
                <option>Normal</option>
                <option>Abnormal</option>
                <option>Pending</option>
              </select>
            </div>
          </div>
          <textarea
            value={data.chestXray}
            onChange={(e) => onChange('chestXray', e.target.value)}
            placeholder="Findings, impressions, or notes..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
          />
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Plus size={14} /> Upload Scan
          </button>
          <input
            ref={scanInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleSelectScan}
            className="hidden"
          />
          {scanFile && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 p-2 bg-blue-50 rounded">
              <span className="font-semibold text-slate-600">Selected:</span>
              <span className="truncate max-w-[220px]">{scanFile.name}</span>
              <a href={scanFile.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          )}
        </div>
      </div>

      {/* PHASE 4: CBC Structured Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">CBC (Complete Blood Count)</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
              <input 
                type="date"
                value={cbcData.cbcDate}
                onChange={(e) => setCbcData({...cbcData, cbcDate: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Hemoglobin (Hgb)</label>
              <input 
                type="text"
                placeholder="g/dL"
                value={cbcData.hgb}
                onChange={(e) => setCbcData({...cbcData, hgb: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Hematocrit (Hct)</label>
              <input 
                type="text"
                placeholder="%"
                value={cbcData.hct}
                onChange={(e) => setCbcData({...cbcData, hct: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">WBC (White Blood Cells)</label>
              <input 
                type="text"
                placeholder="K/µL"
                value={cbcData.wbc}
                onChange={(e) => setCbcData({...cbcData, wbc: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Platelets (Plt.Ct.)</label>
              <input 
                type="text"
                placeholder="K/µL"
                value={cbcData.pltCt}
                onChange={(e) => setCbcData({...cbcData, pltCt: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Blood Type</label>
              <select
                value={cbcData.bldType}
                onChange={(e) => setCbcData({...cbcData, bldType: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              >
                <option>Select</option>
                <option>O+</option>
                <option>O-</option>
                <option>A+</option>
                <option>A-</option>
                <option>B+</option>
                <option>B-</option>
                <option>AB+</option>
                <option>AB-</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => labInputRef.current?.click()}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Plus size={14} /> Upload Lab Result
          </button>
          <input
            ref={labInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleSelectLab}
            className="hidden"
          />
          {labFile && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 p-2 bg-blue-50 rounded">
              <span className="font-semibold text-slate-600">Selected:</span>
              <span className="truncate max-w-[220px]">{labFile.name}</span>
              <a href={labFile.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          )}
        </div>
      </div>

      {/* PHASE 4: U/A Structured Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={18} className="text-indigo-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">U/A (Urinalysis)</h3>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Date</label>
              <input 
                type="date"
                value={uaData.uaDate}
                onChange={(e) => setUaData({...uaData, uaDate: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Glucose/Sugar</label>
              <input 
                type="text"
                placeholder="mg/dL"
                value={uaData.glucoseSugar}
                onChange={(e) => setUaData({...uaData, glucoseSugar: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Protein</label>
              <input 
                type="text"
                placeholder="g/dL"
                value={uaData.protein}
                onChange={(e) => setUaData({...uaData, protein: e.target.value})}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 4: Other Tests */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Others</label>
        <textarea
          value={data.others}
          onChange={(e) => onChange('others', e.target.value)}
          placeholder="ECG, Ultrasound, or other specialized tests..."
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
        />
      </div>

      <RecordHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sectionName="Diagnostic & Lab Section"
        history={mockHistory}
      />
    </div>
  );
};

export default DiagnosticsSection;
