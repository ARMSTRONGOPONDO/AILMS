'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function EditCoursePage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    thumbnail: '',
  });

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await axios.get(`/api/courses/${id}`);
        // apiHandler wraps response in .data.data
        const courseData = res.data.data.course;
        const { title, description, category, thumbnail } = courseData;
        setFormData({ title, description, category, thumbnail: thumbnail || '' });
      } catch (_error) {
        toast.error('Failed to fetch course');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      await axios.put(`/api/courses/${id}`, formData);
      toast.success('Course updated!');
      router.push('/dashboard/tutor/courses');
    } catch (_error) {
      toast.error('Failed to update course');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p>Loading course...</p>;

  return (
    <div className="mx-auto max-w-4xl text-left">
      <div className="mb-6 rounded-2xl border bg-gradient-to-r from-indigo-50 to-white p-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Edit Course Details</h1>
        <p className="mt-2 text-sm font-medium text-gray-600">
          Update the course profile and keep learners informed with clear metadata.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Course Title</label>
          <input
            type="text"
            required
            className="mt-2 block w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-semibold shadow-sm focus:border-indigo-500 focus:ring-0"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Description</label>
          <textarea
            rows={4}
            required
            className="mt-2 block w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium shadow-sm focus:border-indigo-500 focus:ring-0"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Category</label>
          <select
            required
            className="mt-2 block w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-semibold shadow-sm focus:border-indigo-500 focus:ring-0"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="">Select Category</option>
            <option value="Engineering">Engineering</option>
            <option value="Data Science">Data Science</option>
            <option value="Technology">Technology</option>
            <option value="Science">Science</option>
            <option value="Math">Math</option>
            <option value="Programming">Programming</option>
            <option value="Design">Design</option>
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs font-black uppercase tracking-widest text-gray-400">Thumbnail URL (Optional)</label>
          <input
            type="url"
            className="mt-2 block w-full rounded-xl border-2 border-gray-200 px-4 py-3 font-medium shadow-sm focus:border-indigo-500 focus:ring-0"
            value={formData.thumbnail}
            onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
          />
        </div>
        </div>

        {formData.thumbnail && (
          <div className="rounded-2xl border bg-gray-50 p-4">
            <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Thumbnail Preview</p>
            <img
              src={formData.thumbnail}
              alt="Course thumbnail preview"
              className="h-44 w-full rounded-xl object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="flex justify-end space-x-3 border-t pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={updating}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Details'}
          </button>
        </div>
      </form>
    </div>
  );
}
