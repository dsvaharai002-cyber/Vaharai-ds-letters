import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  Building,
  Trash2,
  Check,
  Search,
  Users,
} from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import { DIVISIONS } from '../data/initialData';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onAddUser: (newUser: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onDeleteUser: (userId: string) => void;
}

const ROLES: UserRole[] = ['Super Admin', 'Mega', 'Normal', 'User', 'Mail Officer'];

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New user form state
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('User');
  const [newDivision, setNewDivision] = useState(DIVISIONS[0]);
  const [newStatus, setNewStatus] = useState<UserStatus>('Active');

  if (!isOpen) return null;

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newPassword.trim() || !newName.trim()) {
      alert('அனைத்து புலங்களையும் நிரப்புக!');
      return;
    }

    if (users.some((u) => u.User_ID.toLowerCase() === newUserId.trim().toLowerCase())) {
      alert('இந்த User ID ஏற்கனவே உபயோகத்தில் உள்ளது!');
      return;
    }

    const newUser: User = {
      User_ID: newUserId.trim(),
      Password: newPassword.trim(),
      Name: newName.trim(),
      Role: newRole,
      Division: newDivision,
      Status: newStatus,
    };

    onAddUser(newUser);
    setNewUserId('');
    setNewPassword('');
    setNewName('');
    setShowAddForm(false);
    alert('புதிய பயனர் வெற்றிகரமாக சேர்க்கப்பட்டார்!');
  };

  const handlePasswordChange = (user: User) => {
    const newPass = prompt(`'${user.Name}' பயனருக்கான புதிய கடவுச்சொல்லை உள்ளிடுக:`, user.Password);
    if (newPass && newPass.trim() !== '') {
      onUpdateUser({
        ...user,
        Password: newPass.trim(),
      });
      alert('கடவுச்சொல் மாற்றப்பட்டது.');
    }
  };

  const handleStatusToggle = (user: User) => {
    const nextStatus: UserStatus = user.Status === 'Active' ? 'Locked' : 'Active';
    if (confirm(`பயனர் '${user.Name}' கணக்கின் நிலையை '${nextStatus}' என மாற்ற விரும்புகிறீர்களா?`)) {
      onUpdateUser({
        ...user,
        Status: nextStatus,
      });
    }
  };

  const handleDivisionChange = (user: User, newDiv: string) => {
    onUpdateUser({
      ...user,
      Division: newDiv,
    });
  };

  const handleDelete = (userId: string) => {
    if (users.length <= 1) {
      alert('கடைசிப் பயனரை நீக்க முடியாது!');
      return;
    }
    if (confirm(`பயனர் (${userId}) ஐ நீக்க விரும்புகிறீர்களா?`)) {
      onDeleteUser(userId);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.Name.toLowerCase().includes(q) ||
      u.User_ID.toLowerCase().includes(q) ||
      u.Division.toLowerCase().includes(q) ||
      u.Role.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-900 px-6 py-4 text-white rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-amber-400" />
            <div>
              <h2 className="text-base font-bold">
                பயனர்கள் முகாமைத்துவம் (Super Admin Panel)
              </h2>
              <p className="text-xs text-slate-300">
                புதிய பயனர்களைப் பதிவு செய்தல், கடவுச்சொல், பிரிவு மற்றும் நிலை மாற்றம்
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Sub-header Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="பயனர் பெயர், ID அல்லது பிரிவு மூலம் தேடுக..."
              className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4" />
            {showAddForm ? 'படிவத்தை மூடுக' : '+ புதிய பயனரைச் சேர்'}
          </button>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add New User Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-5 space-y-4"
            >
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                <UserPlus className="h-4 w-4 text-emerald-700" />
                புதிய உத்தியோகத்தர் / பயனர் பதிவு
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-gray-700">User ID *</label>
                  <input
                    type="text"
                    required
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="எ.கா: norm_finance"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">கடவுச்சொல் (Password) *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="கடவுச்சொல்"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">பெயர் (Full Name) *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="உத்தியோகத்தர் பெயர்"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">பங்கு (Role) *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">பிரிவு (Division) *</label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">நிலை (Status)</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserStatus)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="Active">Active (இயக்கத்தில்)</option>
                    <option value="Locked">Locked (முடக்கப்பட்டது)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  ரத்து செய்
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800"
                >
                  <Check className="h-4 w-4" />
                  பயனரைச் சேமிக்க
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-700 font-bold">
                  <th className="py-3 px-3">User ID</th>
                  <th className="py-3 px-3">பெயர் (Name)</th>
                  <th className="py-3 px-3">பங்கு (Role)</th>
                  <th className="py-3 px-3">பிரிவு (Division)</th>
                  <th className="py-3 px-3">நிலை (Status)</th>
                  <th className="py-3 px-3 text-right">நிர்வாக நடவடிக்கைகள்</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const isLocked = user.Status === 'Locked';

                  return (
                    <tr key={user.User_ID} className="hover:bg-gray-50">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">
                        {user.User_ID}
                      </td>
                      <td className="py-3 px-3 font-medium text-gray-900">{user.Name}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                            user.Role === 'Super Admin'
                              ? 'bg-purple-100 text-purple-800'
                              : user.Role === 'Mega'
                              ? 'bg-amber-100 text-amber-800'
                              : user.Role === 'Mail Officer'
                              ? 'bg-blue-100 text-blue-800'
                              : user.Role === 'Normal'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          {user.Role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-600">
                        <select
                          value={user.Division}
                          onChange={(e) => handleDivisionChange(user, e.target.value)}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
                        >
                          {DIVISIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            isLocked
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Lock className="h-3 w-3" /> Locked
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3 w-3" /> Active
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePasswordChange(user)}
                            title="கடவுச்சொல்லை மாற்றுக"
                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            <KeyRound className="h-3 w-3 text-amber-600" />
                            <span>கடவுச்சொல்</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusToggle(user)}
                            title={isLocked ? 'கணக்கை திறக்க (Unlock)' : 'கணக்கை முடக்க (Lock)'}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-white shadow-2xs ${
                              isLocked
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {isLocked ? (
                              <>
                                <Unlock className="h-3 w-3" /> திறக்க
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" /> முடக்குக
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(user.User_ID)}
                            title="பயனரை நீக்கு"
                            className="rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 rounded-b-xl text-xs text-gray-500">
          <span>பதிவான மொத்த பயனர்கள்: {users.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 font-medium text-gray-700 hover:bg-gray-100"
          >
            மூடுக (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
