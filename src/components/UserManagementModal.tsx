import React, { useState } from 'react';
import {
  X,
  UserPlus,
  Shield,
  KeyRound,
  Lock,
  Unlock,
  Building2,
  Trash2,
  Check,
  Search,
  Users,
  Crown,
  Settings,
  Edit,
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

const ROLES: UserRole[] = [
  'Super Admin',
  'Mega',
  'Luxury', // Requested Luxury Role
  'Normal',
  'User',
  'Mail Officer',
];

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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // New user form state
  const [newUserId, setNewUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Luxury');
  const [newDivision, setNewDivision] = useState(DIVISIONS[0]);
  const [newStatus, setNewStatus] = useState<UserStatus>('Active');
  const [newAssignedDivisions, setNewAssignedDivisions] = useState<string[]>([
    DIVISIONS[0],
    DIVISIONS[1],
  ]);
  const [newAssignedOfficers, setNewAssignedOfficers] = useState<string[]>([]);

  // Edit user state
  const [editUserObj, setEditUserObj] = useState<User | null>(null);

  if (!isOpen) return null;

  const handleStartEdit = (user: User) => {
    setEditUserObj({ ...user });
    setEditingUserId(user.User_ID);
    setShowAddForm(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserObj) return;

    onUpdateUser(editUserObj);
    setEditingUserId(null);
    setEditUserObj(null);
    alert(`User profile (${editUserObj.Name}) successfully updated!`);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserId.trim() || !newPassword.trim() || !newName.trim()) {
      alert('Please fill all required fields!');
      return;
    }

    if (users.some((u) => u.User_ID.toLowerCase() === newUserId.trim().toLowerCase())) {
      alert('This User ID already exists. Please choose another ID.');
      return;
    }

    const newUser: User = {
      User_ID: newUserId.trim(),
      Password: newPassword.trim(),
      Name: newName.trim(),
      designation: newDesignation.trim() || undefined,
      Role: newRole,
      Division: newDivision,
      Status: newStatus,
      assignedDivisions: newRole === 'Luxury' ? newAssignedDivisions : undefined,
      assignedOfficers: newRole === 'Luxury' ? newAssignedOfficers : undefined,
    };

    onAddUser(newUser);
    setNewUserId('');
    setNewPassword('');
    setNewName('');
    setNewDesignation('');
    setShowAddForm(false);
    alert(`New user (${newUser.Name}) registered with role ${newUser.Role}!`);
  };

  const handlePasswordChange = (user: User) => {
    const newPass = prompt(`Set new password for user '${user.Name}':`, user.Password);
    if (newPass && newPass.trim() !== '') {
      onUpdateUser({
        ...user,
        Password: newPass.trim(),
      });
      alert('Password updated successfully.');
    }
  };

  const handleStatusToggle = (user: User) => {
    const nextStatus: UserStatus = user.Status === 'Active' ? 'Locked' : 'Active';
    if (confirm(`Change account status of '${user.Name}' to '${nextStatus}'?`)) {
      onUpdateUser({
        ...user,
        Status: nextStatus,
      });
    }
  };

  const handleDelete = (userId: string) => {
    if (users.length <= 1) {
      alert('Cannot delete the last remaining system user!');
      return;
    }
    if (confirm(`Are you sure you want to permanently delete user (${userId})?`)) {
      onDeleteUser(userId);
    }
  };

  const [roleFilter, setRoleFilter] = useState<string>('All');

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'All') {
      if (roleFilter === 'Luxury' && u.Role !== 'Luxury') return false;
      if (roleFilter === 'Super Admin & Mega' && u.Role !== 'Super Admin' && u.Role !== 'Mega') return false;
      if (roleFilter === 'Mail Officer' && u.Role !== 'Mail Officer') return false;
      if (roleFilter === 'Normal & User' && u.Role !== 'Normal' && u.Role !== 'User') return false;
    }
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      u.Name.toLowerCase().includes(q) ||
      u.User_ID.toLowerCase().includes(q) ||
      u.Division.toLowerCase().includes(q) ||
      u.Role.toLowerCase().includes(q) ||
      (u.designation && u.designation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-slate-900 px-6 py-4 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-600/30 p-2 border border-purple-400/40">
              <Shield className="h-6 w-6 text-purple-300" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>User & Role Management</span>
                <span className="rounded bg-purple-700 px-2 py-0.5 text-xs font-mono">
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Configure user roles, passwords, status, and Luxury role custom division permissions.
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

        {/* Subheader Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-3">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, ID, role, or division..."
                className="w-full rounded-lg border border-gray-300 bg-white py-1.5 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setRoleFilter('All')}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  roleFilter === 'All'
                    ? 'bg-slate-900 text-white font-bold shadow-2xs'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                All Users ({users.length})
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('Luxury')}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-bold transition ${
                  roleFilter === 'Luxury'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Luxury ({users.filter((u) => u.Role === 'Luxury').length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('Super Admin & Mega')}
                className={`rounded-lg px-2 py-1 font-semibold transition ${
                  roleFilter === 'Super Admin & Mega'
                    ? 'bg-purple-800 text-white font-bold'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Admin & Mega
              </button>
              <button
                type="button"
                onClick={() => setRoleFilter('Mail Officer')}
                className={`rounded-lg px-2 py-1 font-semibold transition ${
                  roleFilter === 'Mail Officer'
                    ? 'bg-blue-800 text-white font-bold'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                }`}
              >
                Mail Officers
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingUserId(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 transition"
          >
            <UserPlus className="h-4 w-4" />
            {showAddForm ? 'Close Add Form' : '+ Add New Officer / User'}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Existing User Form */}
          {editingUserId && editUserObj && (
            <form
              onSubmit={handleSaveEdit}
              className="rounded-2xl border border-blue-300 bg-blue-50/60 p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                <h3 className="font-bold text-blue-950 text-sm flex items-center gap-2">
                  <Edit className="h-4 w-4 text-blue-700" />
                  Edit Officer Profile: {editUserObj.Name} ({editUserObj.User_ID})
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editUserObj.Name}
                    onChange={(e) => setEditUserObj({ ...editUserObj, Name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 font-semibold text-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Designation / Post</label>
                  <input
                    type="text"
                    value={editUserObj.designation || ''}
                    onChange={(e) =>
                      setEditUserObj({ ...editUserObj, designation: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">System Role *</label>
                  <select
                    value={editUserObj.Role}
                    onChange={(e) =>
                      setEditUserObj({ ...editUserObj, Role: e.target.value as UserRole })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 font-bold text-gray-900"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Primary Division *</label>
                  <select
                    value={editUserObj.Division}
                    onChange={(e) =>
                      setEditUserObj({ ...editUserObj, Division: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Account Status</label>
                  <select
                    value={editUserObj.Status}
                    onChange={(e) =>
                      setEditUserObj({ ...editUserObj, Status: e.target.value as UserStatus })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900"
                  >
                    <option value="Active">Active</option>
                    <option value="Locked">Locked</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Password</label>
                  <input
                    type="text"
                    value={editUserObj.Password}
                    onChange={(e) =>
                      setEditUserObj({ ...editUserObj, Password: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono text-gray-900"
                  />
                </div>
              </div>

              {/* Requirement 5: Dedicated Configuration Section for Luxury Role */}
              {editUserObj.Role === 'Luxury' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Luxury Role Permissions (Super Admin Dedicated Configuration)
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Assign specific divisions and officers that this Luxury user is permitted to monitor, view, and route.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <label className="text-xs font-bold text-gray-800">
                        Permitted Divisions (Click to toggle):
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-amber-900">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setEditUserObj({ ...editUserObj, assignedDivisions: [...DIVISIONS] })}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          All 12
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserObj({ ...editUserObj, assignedDivisions: ['காணிப் பிரிவு (Land Division)', 'திட்டமிடல் பிரிவு (Planning)'] })}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Land & Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserObj({ ...editUserObj, assignedDivisions: ['நிர்வாகப் பிரிவு (Administration)', 'கணக்குப் பிரிவு (Accounts & Finance)'] })}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Admin & Finance
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserObj({ ...editUserObj, assignedDivisions: ['சமூக சேவை (Social)', 'சமுர்த்தி (Samurdhi)', 'கிராம அபிவிருத்தி (Rural Development)'] })}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Social
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditUserObj({ ...editUserObj, assignedDivisions: [] })}
                          className="rounded bg-gray-200 hover:bg-gray-300 text-gray-800 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DIVISIONS.map((div) => {
                        const isAssigned = (editUserObj.assignedDivisions || []).includes(div);
                        return (
                          <button
                            type="button"
                            key={div}
                            onClick={() => {
                              const curr = editUserObj.assignedDivisions || [];
                              const updated = isAssigned
                                ? curr.filter((d) => d !== div)
                                : [...curr, div];
                              setEditUserObj({ ...editUserObj, assignedDivisions: updated });
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isAssigned
                                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {isAssigned ? '✓ ' : '+ '} {div}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-800">
                      Permitted Specific Officers:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
                      {users
                        .filter((u) => u.User_ID !== editUserObj.User_ID)
                        .map((u, uIdx) => {
                          const isAssigned = (editUserObj.assignedOfficers || []).includes(
                            u.User_ID
                          );
                          return (
                            <button
                              type="button"
                              key={`${u.User_ID}-${uIdx}`}
                              onClick={() => {
                                const curr = editUserObj.assignedOfficers || [];
                                const updated = isAssigned
                                ? curr.filter((id) => id !== u.User_ID)
                                : [...curr, u.User_ID];
                                setEditUserObj({
                                  ...editUserObj,
                                  assignedOfficers: updated,
                                });
                              }}
                              className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                                isAssigned
                                  ? 'bg-blue-700 text-white font-bold'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {isAssigned ? '✓ ' : '+ '} {u.Name} ({u.Division})
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-800 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-blue-900"
                >
                  <Check className="h-4 w-4" />
                  Save User Changes
                </button>
              </div>
            </form>
          )}

          {/* Add New User Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateUser}
              className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5 space-y-4"
            >
              <h3 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-700" />
                Add New Officer / System User
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                <div>
                  <label className="mb-1 block font-bold text-gray-700">User ID *</label>
                  <input
                    type="text"
                    required
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="e.g. luxury02 / officer_land"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 font-mono text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Officer full name"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Designation</label>
                  <input
                    type="text"
                    value={newDesignation}
                    onChange={(e) => setNewDesignation(e.target.value)}
                    placeholder="e.g. Assistant Director / DO / Project Officer"
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Role *</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 font-bold text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-bold text-gray-700">Primary Division *</label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-gray-900 focus:border-blue-600 focus:outline-hidden"
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirement 5: Dedicated Configuration Section for Luxury Role */}
              {newRole === 'Luxury' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Luxury Role Permissions (Super Admin Dedicated Configuration)
                      </h4>
                      <p className="text-[11px] text-amber-800">
                        Select which divisions and officers this Luxury user has access to view, track, and route.
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                      <label className="text-xs font-bold text-gray-800">
                        Assigned Permitted Divisions:
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-amber-900">Presets:</span>
                        <button
                          type="button"
                          onClick={() => setNewAssignedDivisions([...DIVISIONS])}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          All 12
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAssignedDivisions(['காணிப் பிரிவு (Land Division)', 'திட்டமிடல் பிரிவு (Planning)'])}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Land & Plan
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAssignedDivisions(['நிர்வாகப் பிரிவு (Administration)', 'கணக்குப் பிரிவு (Accounts & Finance)'])}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Admin & Finance
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAssignedDivisions(['சமூக சேவை (Social)', 'சமுர்த்தி (Samurdhi)', 'கிராம அபிவிருத்தி (Rural Development)'])}
                          className="rounded bg-amber-200 hover:bg-amber-300 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Social
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewAssignedDivisions([])}
                          className="rounded bg-gray-200 hover:bg-gray-300 text-gray-800 px-1.5 py-0.5 text-[10px] font-bold"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DIVISIONS.map((div) => {
                        const isAssigned = newAssignedDivisions.includes(div);
                        return (
                          <button
                            type="button"
                            key={div}
                            onClick={() => {
                              setNewAssignedDivisions(
                                isAssigned
                                  ? newAssignedDivisions.filter((d) => d !== div)
                                  : [...newAssignedDivisions, div]
                              );
                            }}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              isAssigned
                                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {isAssigned ? '✓ ' : '+ '} {div}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-gray-800">
                      Assigned Permitted Officers:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
                      {users.map((u, uIdx) => {
                        const isAssigned = newAssignedOfficers.includes(u.User_ID);
                        return (
                          <button
                            type="button"
                            key={`${u.User_ID}-${uIdx}`}
                            onClick={() => {
                              setNewAssignedOfficers(
                                isAssigned
                                  ? newAssignedOfficers.filter((id) => id !== u.User_ID)
                                  : [...newAssignedOfficers, u.User_ID]
                              );
                            }}
                            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                              isAssigned
                                ? 'bg-blue-700 text-white font-bold'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {isAssigned ? '✓ ' : '+ '} {u.Name} ({u.Division})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800"
                >
                  <Check className="h-4 w-4" />
                  Save New User
                </button>
              </div>
            </form>
          )}

          {/* User Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-100 text-gray-700 font-bold">
                  <th className="py-3 px-3">User ID</th>
                  <th className="py-3 px-3">Name & Designation</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Division</th>
                  <th className="py-3 px-3">Luxury Permissions</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user, uIdx) => {
                  const isLocked = user.Status === 'Locked';
                  const isLuxury = user.Role === 'Luxury';

                  return (
                    <tr key={`${user.User_ID}-${uIdx}`} className="hover:bg-gray-50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-blue-900">
                        {user.User_ID}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-gray-900">{user.Name}</div>
                        <div className="text-[11px] text-gray-500">
                          {user.designation || 'No designation set'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-bold ${
                            user.Role === 'Super Admin'
                              ? 'bg-purple-100 text-purple-900'
                              : user.Role === 'Mega'
                              ? 'bg-amber-100 text-amber-900'
                              : user.Role === 'Luxury'
                              ? 'bg-amber-200 text-amber-950 border border-amber-300'
                              : user.Role === 'Mail Officer'
                              ? 'bg-blue-100 text-blue-900'
                              : user.Role === 'Normal'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          {user.Role === 'Luxury' && <Crown className="h-3 w-3 text-amber-700" />}
                          {user.Role}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-800 font-medium">{user.Division}</td>
                      <td className="py-3 px-3 text-[11px]">
                        {isLuxury ? (
                          <div className="max-w-[200px] space-y-0.5">
                            <span className="font-bold text-amber-900">
                              Divisions ({(user.assignedDivisions || []).length}):
                            </span>{' '}
                            <span className="text-gray-600 line-clamp-1">
                              {(user.assignedDivisions || []).join(', ') || 'All'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">Standard</span>
                        )}
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(user)}
                            title="Edit User Profile & Permissions"
                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <Settings className="h-3 w-3 text-blue-700" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePasswordChange(user)}
                            title="Reset password"
                            className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            <KeyRound className="h-3 w-3 text-amber-600" />
                            <span>Password</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStatusToggle(user)}
                            title={isLocked ? 'Unlock User' : 'Lock User'}
                            className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-bold text-white shadow-2xs ${
                              isLocked
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {isLocked ? 'Unlock' : 'Lock'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(user.User_ID)}
                            title="Delete user"
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

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 rounded-b-2xl text-xs text-gray-500">
          <span>Registered System Users: {users.length}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
