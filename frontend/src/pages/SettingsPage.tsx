import { useState, type FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile, uploadAvatar } from '../api/users';
import { changePassword } from '../api/auth';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleProfileUpdate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await updateProfile({ display_name: displayName, bio });
      updateUser({ display_name: displayName, bio });
      setMessage('Profile updated');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(file);
      updateUser({ avatar_url: url });
      setMessage('Avatar updated');
    } catch {
      setError('Avatar upload failed');
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await changePassword(currentPw, newPw);
      setCurrentPw('');
      setNewPw('');
      setMessage('Password changed. You will need to log in again.');
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password change failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settings</h1>

      {message && <p className="text-green-600 text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded">{message}</p>}
      {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}

      {/* Theme */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-medium text-gray-900 dark:text-white mb-3">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                theme === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Avatar */}
      <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="font-medium text-gray-900 dark:text-white mb-3">Avatar</h2>
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl">
              {user?.display_name[0]?.toUpperCase()}
            </div>
          )}
          <label className="cursor-pointer text-sm text-indigo-600 hover:underline">
            Change avatar
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>
      </section>

      {/* Profile */}
      <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="font-medium text-gray-900 dark:text-white">Profile</h2>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={100} required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
        </div>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          Save Profile
        </button>
      </form>

      {/* Password */}
      <form onSubmit={handlePasswordChange} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h2 className="font-medium text-gray-900 dark:text-white">Change Password</h2>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
          <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required autoComplete="current-password" />
        </div>
        <div>
          <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">New Password</label>
          <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={8}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" required autoComplete="new-password" />
        </div>
        <button type="submit" disabled={saving}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          Change Password
        </button>
      </form>
    </div>
  );
}
