'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

interface User {
  name: string;
  full_name: string;
  email: string;
  username?: string;
  enabled: number;
  user_type: string;
  last_login?: string;
  creation?: string;
  roles: string[];
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);

  const emptyUser = {
    username: '',
    email: '',
    full_name: '',
    new_password: '',
    roles: [] as string[],
    enabled: 1 as 0 | 1,
  };

  const [newUser, setNewUser] = useState(emptyUser);

  const AVAILABLE_ROLES = [
    'System Manager',
    'Sales User',
    'Sales Manager',
    'Purchase User',
    'Purchase Manager',
    'Purchase Master Manager',
    'Stock User',
    'Stock Manager',
    'Item Manager',
    'Accounts User',
    'Accounts Manager',
    'HR User',
    'HR Manager',
    'Report Manager',
    'Projects User',
    'Projects Manager',
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/setup/users', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data || []);
      } else {
        setError(data.message || 'Gagal memuat data pengguna');
      }
    } catch {
      setError('Gagal memuat data pengguna');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSuccessMessage('');

    const formatError = (msg: string) => {
      if (!msg) return 'Gagal membuat pengguna';
      if (msg.toLowerCase().includes('common words are easy to guess')) {
        return 'Kata sandi terlalu mudah ditebak. Gunakan kombinasi kata unik, angka, atau karakter khusus.';
      }
      if (msg.toLowerCase().includes('names and surnames are easy to guess')) {
        return 'Kata sandi mirip dengan nama lengkap. Gunakan kata lain yang tidak mengandung nama Anda, tambah angka/simbol.';
      }
      return msg;
    };

    if (!newUser.email) {
      setError('Email wajib diisi');
      setCreating(false);
      return;
    }

    if (!newUser.full_name || newUser.full_name.trim().length < 3) {
      setError('Nama lengkap minimal 3 karakter');
      setCreating(false);
      return;
    }

    if (!newUser.roles || newUser.roles.length === 0) {
      setError('Pilih minimal satu peran');
      setCreating(false);
      return;
    }

    if (newUser.new_password && newUser.new_password !== confirmPassword) {
      setError('Password dan konfirmasi tidak sama');
      setCreating(false);
      return;
    }

    try {
      const isEdit = Boolean(editingName);
      const response = await fetch('/api/setup/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...newUser, name: editingName || undefined }),
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage(data.message || (isEdit ? 'Pengguna diperbarui' : 'Pengguna berhasil dibuat'));
        setShowCreateDialog(false);
        setNewUser(emptyUser);
        setConfirmPassword('');
        setEditingName(null);
        fetchUsers();
      } else {
        setError(formatError(data.message));
      }
    } catch {
      setError('Terjadi kesalahan saat membuat pengguna');
    } finally {
      setCreating(false);
    }
  };

  const toggleRole = (role: string) => {
    setNewUser(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const openCreateDialog = () => {
    setNewUser(emptyUser);
    setConfirmPassword('');
    setEditingName(null);
    setError('');
    setSuccessMessage('');
    setShowCreateDialog(true);
  };

  const openEditDialog = (user: User) => {
    setNewUser({
      username: user.username || '',
      email: user.email || '',
      full_name: user.full_name || '',
      new_password: '',
      roles: user.roles || [],
      enabled: user.enabled ? 1 : 0,
    });
    setConfirmPassword('');
    setEditingName(user.name);
    setError('');
    setSuccessMessage('');
    setShowCreateDialog(true);
  };

  const filteredUsers = users.filter(u =>
    !searchTerm ||
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <LoadingSpinner message="Memuat data pengguna..." />;

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500">Kelola pengguna dan hak akses sistem</p>
        </div>
        <button
          onClick={openCreateDialog}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
        >
          + Tambah Pengguna
        </button>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
      {successMessage && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMessage}</div>}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Cari pengguna..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        />
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peran</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login Terakhir</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada pengguna ditemukan</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr
                  key={user.name}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => openEditDialog(user)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-700 font-medium text-sm">{(user.full_name || user.email || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{user.full_name || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles || []).slice(0, 3).map(role => (
                        <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{role}</span>
                      ))}
                      {(user.roles || []).length > 3 && (
                        <span className="text-xs text-gray-400">+{user.roles.length - 3} lainnya</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{editingName ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h3>
            <form onSubmit={handleCreateUser} autoComplete="off" className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  autoComplete="off"
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => {
                    const email = e.target.value;
                    setNewUser(prev => ({
                      ...prev,
                      email,
                      username: prev.username || email,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  autoComplete="off"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  autoComplete="new-password"
                  placeholder="Gunakan email atau username khusus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="radio"
                      checked={newUser.enabled === 1}
                      onChange={() => setNewUser(prev => ({ ...prev, enabled: 1 }))}
                      className="text-indigo-600"
                    />
                    <span>Aktif</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="radio"
                      checked={newUser.enabled === 0}
                      onChange={() => setNewUser(prev => ({ ...prev, enabled: 0 }))}
                      className="text-indigo-600"
                    />
                    <span>Nonaktif</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.new_password}
                    onChange={(e) => setNewUser({ ...newUser, new_password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-10"
                    autoComplete="new-password"
                    placeholder="Kosongkan untuk kirim email reset"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 text-sm"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm pr-10"
                    autoComplete="new-password"
                    placeholder="Ulangi password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 text-sm"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Peran (Roles)</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_ROLES.map(role => (
                    <label key={role} className="flex items-center space-x-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newUser.roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {creating ? (editingName ? 'Menyimpan...' : 'Membuat...') : (editingName ? 'Simpan Perubahan' : 'Buat Pengguna')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
