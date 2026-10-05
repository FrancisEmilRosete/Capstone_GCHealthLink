'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, UserCircle } from 'lucide-react';

interface Staff {
  id: number;
  name: string;
  position: string;
}

export default function ClinicStaffPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', position: '' });

  const loadStaff = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const res = await api.get<Staff[]>('/staff', token);
      setStaffList(res);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load clinic staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) return;
      
      if (editingId) {
        await api.put(`/staff/${editingId}`, formData, token);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/staff', formData, token);
        toast.success('Staff added successfully');
      }
      
      setFormVisible(false);
      setEditingId(null);
      setFormData({ name: '', position: '' });
      loadStaff();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save staff');
    }
  };

  const handleEdit = (staff: Staff) => {
    setFormData({ name: staff.name, position: staff.position });
    setEditingId(staff.id);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    try {
      const token = getToken();
      if (!token) return;
      await api.delete(`/staff/${id}`, token);
      toast.success('Staff deleted');
      loadStaff();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete staff');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manage Clinic Staff</h1>
        <button
          onClick={() => {
            setFormData({ name: '', position: '' });
            setEditingId(null);
            setFormVisible(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {formVisible && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Staff Member' : 'Add New Staff Member'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Full Name (e.g. Dr. Jane Doe)"
              className="flex-1 rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-teal-500 focus:outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <select
              className="flex-1 rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              required
            >
              <option value="" disabled>Select Position</option>
              <option value="Physician">Physician</option>
              <option value="Dentist">Dentist</option>
              <option value="Nurse">Nurse</option>
              <option value="Staff">Staff</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-500">Loading staff directory...</div>
        ) : staffList.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No staff members found.</div>
        ) : (
          staffList.map(staff => (
            <div key={staff.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between group hover:border-teal-200 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                  <UserCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{staff.name}</h3>
                  <p className="text-sm text-slate-500">{staff.position}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(staff)} className="text-teal-600 hover:bg-teal-50 p-1.5 rounded" title="Edit">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(staff.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
