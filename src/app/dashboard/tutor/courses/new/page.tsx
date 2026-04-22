'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function NewCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    thumbnail: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post('/api/courses', formData);
      toast.success('Course created!');
      // apiHandler wraps response in .data.data
      const courseId = res.data.data._id;
      router.push(`/dashboard/tutor/courses/${courseId}/content`);
    } catch (error) {
      toast.error('Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl text-left">
      <div className="mb-6 rounded-2xl border bg-gradient-to-r from-indigo-50 to-white p-6">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Create New Course</h1>
        <p className="mt-2 text-sm font-medium text-gray-600">
          Start with clear course details. You can add modules and lessons in the next step.
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
            placeholder="e.g. Introduction to Data Structures"
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
            placeholder="Describe what students will learn and who this course is for."
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
            placeholder="https://example.com/image.jpg"
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
            disabled={loading}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>
    </div>
  );
}
