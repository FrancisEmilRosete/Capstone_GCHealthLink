import React from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';

interface Record {
  id: string;
  date: string;
  complaint: string;
  treatment: string;
  remarks: string;
}

interface HistoryTableProps {
  records: Record[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof Record, value: string) => void;
  onDelete: (id: string) => void;
}

const HistoryTable: React.FC<HistoryTableProps> = ({ records, onAdd, onUpdate, onDelete }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="text-lg font-semibold text-slate-800">Family / Medical History Records</h2>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Date</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Complaint / Diagnosis</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Treatment</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Remarks</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                    No records found. Click &quot;Add Entry&quot; to start.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={record.date}
                        onChange={(e) => onUpdate(record.id, 'date', e.target.value)}
                        className="w-full bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 text-sm outline-none"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.complaint}
                        onChange={(e) => onUpdate(record.id, 'complaint', e.target.value)}
                        className="w-full bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 text-sm outline-none"
                        placeholder="Type complaint..."
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.treatment}
                        onChange={(e) => onUpdate(record.id, 'treatment', e.target.value)}
                        className="w-full bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 text-sm outline-none"
                        placeholder="Type treatment..."
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.remarks}
                        onChange={(e) => onUpdate(record.id, 'remarks', e.target.value)}
                        className="w-full bg-transparent focus:bg-white border-none focus:ring-1 focus:ring-blue-400 rounded px-1 py-1 text-sm outline-none"
                        placeholder="Add remarks..."
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => onDelete(record.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-md"
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoryTable;
