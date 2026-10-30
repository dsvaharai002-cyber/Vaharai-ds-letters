import React, { useState } from 'react';
import { User, Role, GNDivision } from '../types';
import { Language, translations } from '../translations/i18n';

interface StaffManagementViewProps {
  users: User[];
  divisions: GNDivision[];
  currentUser: User;
  lang: Language;
  onUpdateUsers: (users: User[]) => void;
  onAuditLog: (action: string, details: string) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  users,
  divisions,
  currentUser,
  lang,
  onUpdateUsers,
  onAuditLog,
}) => {
  const t = translations[lang];

  // STRICT ACCESS RESTRICTION: Only SUPERADMIN can manage staff
  const isSuperAdmin = currentUser.role === 'SUPERADMIN';

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPasswordUser, setEditingPasswordUser] = useState<User | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isSuperAdmin) {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto shadow-xs">
        <span className="text-4xl block mb-2">🚫</span>
        <h3 className="text-base font-bold text-red-800">
          {t.accessDenied}
        </h3>
        <p className="text-xs text-slate-500 mt-2">
          {lang === 'ta'
            ? 'அலுவலர் கணக்குகள் மற்றும் கடவுச்சொற்களை முகாமை செய்யும் அதிகாரம் பிரதேச செயலக தலைமை நிர்வாகிக்கு (Super Admin) மட்டுமே வழங்கப்பட்டுள்ளது.'
            : 'User management, role assignment, and password credentials are strictly reserved for the Super Admin.'}
        </p>
      </div>
    );
  }

  // New User Form State
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<Role>('GRAMANIILATHARI');
  const [newDivision, setNewDivision] = useState('211');
  const [newPassword, setNewPassword] = useState('');

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newPassword.trim()) return;

    if (users.some((u) => u.id === newId.trim())) {
      alert(lang === 'ta' ? 'இந்த பயனர் இலக்கம் ஏற்கனவே உள்ளது!' : 'This User ID already exists!');
      return;
    }

    const created: User = {
      id: newId.trim(),
      password: newPassword.trim(),
      name: newName.trim(),
      role: newRole,
      division: newRole === 'GRAMANIILATHARI' ? newDivision : 'ALL',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const updated = [...users, created];
    onUpdateUsers(updated);
    onAuditLog('CREATE_USER', `Created staff user ${created.name} (ID: ${created.id}, Role: ${created.role})`);

    setShowAddModal(false);
    setNewId('');
    setNewName('');
    setNewPassword('');
    setSuccessMsg(lang === 'ta' ? 'புதிய அலுவலர் வெற்றிகரமாக சேர்க்கப்பட்டார்!' : 'New staff member added successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPasswordUser || !newPasswordVal.trim()) return;

    const updated = users.map((u) => {
      if (u.id === editingPasswordUser.id) {
        return { ...u, password: newPasswordVal.trim() };
      }
      return u;
    });

    onUpdateUsers(updated);
    onAuditLog('UPDATE_PASSWORD', `Updated unique password for user ID: ${editingPasswordUser.id}`);

    setEditingPasswordUser(null);
    setNewPasswordVal('');
    setSuccessMsg(lang === 'ta' ? 'கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது!' : 'Password changed successfully!');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const toggleUserStatus = (userId: string) => {
    if (userId === currentUser.id) {
      alert(lang === 'ta' ? 'தங்கள் சொந்த கணக்கை முடக்க முடியாது!' : 'Cannot deactivate your own active account!');
      return;
    }

    const updated = users.map((u) => {
      if (u.id === userId) {
        const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        return { ...u, status: nextStatus as 'ACTIVE' | 'INACTIVE' };
      }
      return u;
    });

    onUpdateUsers(updated);
    onAuditLog('TOGGLE_STATUS', `Toggled status for user ID: ${userId}`);
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {t.staffTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ta'
              ? 'பயனர்களின் ரோலுக்கு ஏற்ப தகவல் பிரிப்பு மற்றும் கடவுச்சொல் தனித்துவ மேலாண்மை'
              : 'Role-based access controls, division assignments, and secure credentials'}
          </p>
        </div>

        <button
          onClick={() => {
            setNewPassword(generateRandomPassword());
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs shrink-0"
        >
          <span>➕</span>
          <span>{t.addUser}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* Staff Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
            {users.length} {t.records}
          </span>
          <span className="text-[11px] text-slate-500">
            {lang === 'ta' ? 'ரோல்கள்: Super Admin, Admin, GN Officer, Data Entry, Reception' : 'Roles: Super Admin, Admin, GN Officer, Data Entry, Reception'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">{t.nameEnglish}</th>
                <th className="py-3 px-4">{t.role}</th>
                <th className="py-3 px-4">{t.division}</th>
                <th className="py-3 px-4">{t.password} (பாஸ்வேட்)</th>
                <th className="py-3 px-4">{t.status}</th>
                <th className="py-3 px-4 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {u.id}
                      {isCurrent && (
                        <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-sans">
                          {lang === 'ta' ? 'நீங்களே' : 'You'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                        u.role === 'SUPERADMIN' ? 'bg-red-100 text-red-900 border border-red-200' :
                        u.role === 'ADMIN 1' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                        u.role === 'ADMIN 2' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' :
                        u.role === 'NORMAL' ? 'bg-amber-300 text-slate-950 border border-amber-400' :
                        u.role === 'GRAMANIILATHARI' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {u.division === 'ALL' ? (
                        <span className="text-slate-500 font-medium">{t.allDivisions}</span>
                      ) : (
                        <span className="font-mono font-semibold text-emerald-900">
                          {u.division} - {divisions.find((d) => d.code === u.division)?.nameTa || u.division}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <span className="tracking-widest">••••••••</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingPasswordUser(u);
                          setNewPasswordVal(generateRandomPassword());
                        }}
                        className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-medium transition-colors"
                      >
                        🔑 {t.changePassword}
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => toggleUserStatus(u.id)}
                          className={`px-2 py-1 text-[11px] rounded font-medium transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'text-red-700 hover:bg-red-50'
                              : 'text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'முடக்கு' : 'செயலாக்கு'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Change Password */}
      {editingPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
              {t.changePassword} - {editingPasswordUser.name} (ID: {editingPasswordUser.id})
            </h3>

            <form onSubmit={handleSavePassword} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.newPassword}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal(generateRandomPassword())}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                    title="Generate Random"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPasswordUser(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add User */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
              {t.addUser}
            </h3>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    User ID (இலக்கம்)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2024"
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.nameEnglish} / பெயர்
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Staff name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.role} (பணி நிலை)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="ADMIN 1">ADMIN 1 (Administrative Officer 01 - அட்மின் 1)</option>
                  <option value="ADMIN 2">ADMIN 2 (Administrative Officer 02 - அட்மின் 2)</option>
                  <option value="SUPERADMIN">SUPERADMIN (Divisional Secretary - தலைமை நிர்வாகி)</option>
                  <option value="ELDERLY_OFFICER">ELDERLY_OFFICER (முதியோர் நலன்புரி உத்தியோகத்தர்)</option>
                  <option value="MATERNITY_OFFICER">MATERNITY_OFFICER (கர்ப்பிணித் தாய்மார்கள் பதிவாளர்)</option>
                  <option value="DISABILITY_OFFICER">DISABILITY_OFFICER (மாற்றுத்திறனாளிகள் பதிவாளர்)</option>
                  <option value="GRAMANIILATHARI">GRAMANIILATHARI (Grama Niladhari - கிராம அலுவலர்)</option>
                  <option value="Reception Registrar">Reception Registrar (Front Desk - வரவேற்பாளர்)</option>
                  <option value="DATAENRY OFFCER">DATAENRY OFFCER (Data Entry Specialist - தரவு உள்ளீட்டாளர்)</option>
                  <option value="NORMAL">NORMAL (Live Counter Display Screen - நோமல்)</option>
                </select>
              </div>

              {newRole === 'GRAMANIILATHARI' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {t.division} (கிராம அலுவலர் பிரிவு)
                  </label>
                  <select
                    value={newDivision}
                    onChange={(e) => setNewDivision(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {divisions.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.code} - {d.nameTa} ({d.nameEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {t.password} (தனித்துவ கடவுச்சொல்)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                    title="Generate Random"
                  >
                    🎲
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
