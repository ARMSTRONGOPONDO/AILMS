'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  Settings as SettingsIcon, 
  Save, 
  Loader2, 
  ShieldCheck, 
  UserCheck, 
  UploadCloud,
  Layout
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    platformName: 'AI-LMS',
    maxFileSizeMB: 10,
    allowStudentReg: true,
    allowTutorReg: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios.get('/api/admin/settings')
      .then(res => {
        setSettings(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load settings');
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.patch('/api/admin/settings', settings);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 text-left">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Configure global platform behavior and restrictions.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Platform Identity */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center tracking-widest">
              <Layout className="h-4 w-4 mr-2" /> Platform Identity
            </h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Platform Name</label>
              <input 
                type="text"
                className="w-full border-2 rounded-xl p-3 focus:border-indigo-500 outline-none transition-all font-medium"
                value={settings.platformName}
                onChange={e => setSettings({...settings, platformName: e.target.value})}
              />
              <p className="text-[10px] text-gray-400 mt-2 italic">Visible on login, sidebar, and emails.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Max Upload Size (MB)</label>
              <div className="relative">
                <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                  type="number"
                  className="w-full border-2 rounded-xl p-3 pl-10 focus:border-indigo-500 outline-none transition-all font-medium"
                  value={settings.maxFileSizeMB}
                  onChange={e => setSettings({...settings, maxFileSizeMB: parseInt(e.target.value)})}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 italic">Applies to lesson PDFs and DOCX files.</p>
            </div>
          </div>

          {/* Registration Controls */}
          <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
            <h2 className="text-sm font-bold text-gray-400 uppercase flex items-center tracking-widest">
              <ShieldCheck className="h-4 w-4 mr-2" /> Security & Access
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border">
                 <div>
                    <p className="text-sm font-bold text-gray-700">Student Self-Registration</p>
                    <p className="text-[10px] text-gray-500 font-medium">Allow new students to create accounts</p>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setSettings({...settings, allowStudentReg: !settings.allowStudentReg})}
                  className={clsx(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                    settings.allowStudentReg ? "bg-indigo-600" : "bg-gray-200"
                  )}
                 >
                    <span className={clsx(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      settings.allowStudentReg ? "translate-x-5" : "translate-x-0"
                    )} />
                 </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border">
                 <div>
                    <p className="text-sm font-bold text-gray-700">Tutor Registration</p>
                    <p className="text-[10px] text-gray-500 font-medium">Allow new tutors to register</p>
                 </div>
                 <button 
                  type="button"
                  onClick={() => setSettings({...settings, allowTutorReg: !settings.allowTutorReg})}
                  className={clsx(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none",
                    settings.allowTutorReg ? "bg-indigo-600" : "bg-gray-200"
                  )}
                 >
                    <span className={clsx(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      settings.allowTutorReg ? "translate-x-5" : "translate-x-0"
                    )} />
                 </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start">
               <UserCheck className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
               <p className="text-xs text-amber-800 leading-relaxed font-medium">
                 Disabling these will prevent new public registrations. Admins can still manually create users from the User Management panel.
               </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
           <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-10 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
           >
             {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
             Save All Changes
           </button>
        </div>
      </form>
    </div>
  );
}
