'use client';

import React, { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Plus } from 'lucide-react';

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
      <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Diagnostic & Lab Section</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={18} className="text-blue-500" />
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Chest X-Ray</label>
          </div>
          <textarea
            value={data.chestXray}
            onChange={(e) => onChange('chestXray', e.target.value)}
            placeholder="Findings, impressions, or attachment link..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
          />
          <button
            type="button"
            onClick={() => scanInputRef.current?.click()}
            className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
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
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Selected:</span>
              <span className="truncate max-w-[220px]">{scanFile.name}</span>
              <a href={scanFile.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={18} className="text-indigo-500" />
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Laboratory Test</label>
          </div>
          <textarea
            value={data.laboratoryTest}
            onChange={(e) => onChange('laboratoryTest', e.target.value)}
            placeholder="CBC, Urinalysis, Blood Sugar results..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
          />
          <button
            type="button"
            onClick={() => labInputRef.current?.click()}
            className="mt-3 flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
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
            <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-600">Selected:</span>
              <span className="truncate max-w-[220px]">{labFile.name}</span>
              <a href={labFile.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                View
              </a>
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Others</label>
          <textarea
            value={data.others}
            onChange={(e) => onChange('others', e.target.value)}
            placeholder="ECG, Ultrasound, or other specialized tests..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none text-sm"
          />
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsSection;
