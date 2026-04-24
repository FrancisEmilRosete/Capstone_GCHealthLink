'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Printer, Download, Save, Send } from 'lucide-react';
import PrescriptionPad from '@/components/doctor/PrescriptionPad';

const PrescriptionPage = () => {
  const params = useParams();
  const router = useRouter();
  const [medicines, setMedicines] = useState<any[]>([]);

  // Mock Patient (Normally fetched)
  const patient = {
    fullName: 'Francis Emil Rosete',
    age: 21,
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  };

  const handleAdd = () => {
    setMedicines(prev => [...prev, { id: Math.random().toString(), name: '', dosage: '', frequency: '', duration: '' }]);
  };

  const handleUpdate = (id: string, f: string, v: string) => {
    setMedicines(prev => prev.map(m => m.id === id ? { ...m, [f]: v } : m));
  };

  const handleDelete = (id: string) => {
    setMedicines(prev => prev.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">New Prescription</h1>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
            >
              <Printer size={16} /> Print Rx
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">
              <Save size={16} /> Save & Send
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-8 flex items-center gap-3 text-blue-700">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Send size={16} />
          </div>
          <p className="text-sm font-medium">
            This prescription will be automatically sent to the patient&apos;s digital wallet and the clinic pharmacy.
          </p>
        </div>

        <PrescriptionPad 
          patient={patient}
          medicines={medicines}
          onAddMedicine={handleAdd}
          onUpdateMedicine={handleUpdate as any}
          onDeleteMedicine={handleDelete}
          onPrint={() => window.print()}
          onDownload={() => {}}
          onSave={() => alert('Prescription saved!')}
        />
      </div>
    </div>
  );
};

export default PrescriptionPage;
