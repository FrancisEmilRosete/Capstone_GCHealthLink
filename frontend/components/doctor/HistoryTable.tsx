import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

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
  const [isEditing, setIsEditing] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-2 border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800">Family / Medical History Records</h2>
        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 size={16} /> Update
            </button>
          ) : (
            <>
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-3 py-1.5 border border-blue-200 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors"
              >
                <Plus size={16} /> Add Entry
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-1.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                <Save size={16} /> Save
              </button>
            </>
          )}
        </div>
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
                {isEditing && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={isEditing ? 5 : 4} className="px-4 py-8 text-center text-slate-400 italic text-sm">
                    No records found.
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
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none rounded px-1 py-1 text-sm outline-none transition-all ${
                          isEditing ? 'focus:bg-white focus:ring-1 focus:ring-blue-400' : 'cursor-default appearance-none'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.complaint}
                        onChange={(e) => onUpdate(record.id, 'complaint', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none rounded px-1 py-1 text-sm outline-none transition-all ${
                          isEditing ? 'focus:bg-white focus:ring-1 focus:ring-blue-400' : 'cursor-default'
                        }`}
                        placeholder={isEditing ? "Type complaint..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.treatment}
                        onChange={(e) => onUpdate(record.id, 'treatment', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none rounded px-1 py-1 text-sm outline-none transition-all ${
                          isEditing ? 'focus:bg-white focus:ring-1 focus:ring-blue-400' : 'cursor-default'
                        }`}
                        placeholder={isEditing ? "Type treatment..." : ""}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={record.remarks}
                        onChange={(e) => onUpdate(record.id, 'remarks', e.target.value)}
                        readOnly={!isEditing}
                        className={`w-full bg-transparent border-none rounded px-1 py-1 text-sm outline-none transition-all ${
                          isEditing ? 'focus:bg-white focus:ring-1 focus:ring-blue-400' : 'cursor-default'
                        }`}
                        placeholder={isEditing ? "Add remarks..." : ""}
                      />
                    </td>
                    {isEditing && (
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => onDelete(record.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-md"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
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
