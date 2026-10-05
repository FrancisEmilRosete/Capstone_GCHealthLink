'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2 } from 'lucide-react';

interface Department {
  id: number;
  code: string;
  name: string;
}

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '' });

  const loadDepartments = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await api.get<Department[]>('/departments', token);
      setDepartments(res);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) return;
      
      if (editingId) {
        await api.put(`/departments/${editingId}`, formData, token);
        toast.success('Department updated successfully');
      } else {
        await api.post('/departments', formData, token);
        toast.success('Department created successfully');
      }
      
      setFormVisible(false);
      setEditingId(null);
      setFormData({ code: '', name: '' });
      loadDepartments();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save department');
    }
  };

  const handleEdit = (department: Department) => {
    setFormData({ code: department.code, name: department.name });
    setEditingId(department.id);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const token = getToken();
      if (!token) return;
      await api.delete(`/departments/${id}`, token);
      toast.success('Department deleted');
      loadDepartments();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete department');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manage Departments</h1>
        <button
          onClick={() => {
            setFormData({ code: '', name: '' });
            setEditingId(null);
            setFormVisible(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {formVisible && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Department' : 'Add New Department'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Department Code (e.g. CCS)"
              className="flex-1 rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />
            <input
              type="text"
              placeholder="Full Department Name"
              className="flex-[2] rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <div className="flex gap-2">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Save
              </button>
              <button 
                type="button" 
                onClick={() => setFormVisible(false)}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Department Code</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Department Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">Loading departments...</td></tr>
            ) : departments.length === 0 ? (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No departments found.</td></tr>
            ) : (
              departments.map(dept => (
                <tr key={dept.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{dept.code}</td>
                  <td className="px-6 py-4">{dept.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(dept)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(dept.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
