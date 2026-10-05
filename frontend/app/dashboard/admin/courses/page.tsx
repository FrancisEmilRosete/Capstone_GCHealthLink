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

interface Course {
  id: number;
  code: string;
  name: string;
  department_id?: number | null;
  department?: Department | null;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ code: '', name: '', department_id: '' });

  const loadData = async () => {
    try {
      const token = getToken();
      if (!token) return;
      const [coursesRes, deptsRes] = await Promise.all([
        api.get<Course[]>('/courses', token),
        api.get<Department[]>('/departments', token)
      ]);
      setCourses(coursesRes);
      setDepartments(deptsRes);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getToken();
      if (!token) return;
      
      const payload = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id) : null
      };

      if (editingId) {
        await api.put(`/courses/${editingId}`, payload, token);
        toast.success('Course updated successfully');
      } else {
        await api.post('/courses', payload, token);
        toast.success('Course created successfully');
      }
      
      setFormVisible(false);
      setEditingId(null);
      setFormData({ code: '', name: '', department_id: '' });
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save course');
    }
  };

  const handleEdit = (course: Course) => {
    setFormData({ 
      code: course.code, 
      name: course.name,
      department_id: course.department_id ? course.department_id.toString() : ''
    });
    setEditingId(course.id);
    setFormVisible(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const token = getToken();
      if (!token) return;
      await api.delete(`/courses/${id}`, token);
      toast.success('Course deleted');
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete course');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manage Courses</h1>
        <button
          onClick={() => {
            setFormData({ code: '', name: '', department_id: '' });
            setEditingId(null);
            setFormVisible(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {formVisible && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">{editingId ? 'Edit Course' : 'Add New Course'}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                placeholder="Course Code (e.g. BSCS)"
                className="flex-1 rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-teal-500 focus:outline-none"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Full Course Name"
                className="flex-[2] rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-teal-500 focus:outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <select
                className="flex-[1.5] rounded-lg border-slate-300 px-4 py-2 border focus:ring-2 focus:ring-teal-500 focus:outline-none"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              >
                <option value="">No Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.code} - {dept.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <button 
                type="button" 
                onClick={() => setFormVisible(false)}
                className="bg-slate-100 text-slate-700 px-6 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button type="submit" className="bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-700">Course Code</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Course Name</th>
              <th className="px-6 py-4 font-semibold text-slate-700">Department</th>
              <th className="px-6 py-4 font-semibold text-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">Loading courses...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No courses found.</td></tr>
            ) : (
              courses.map(course => (
                <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{course.code}</td>
                  <td className="px-6 py-4">{course.name}</td>
                  <td className="px-6 py-4">{course.department?.code || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleEdit(course)} className="text-teal-600 hover:text-teal-800 p-2" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(course.id)} className="text-rose-500 hover:text-rose-700 p-2" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
