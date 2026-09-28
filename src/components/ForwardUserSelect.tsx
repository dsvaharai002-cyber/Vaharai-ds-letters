import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Users, Building2 } from 'lucide-react';
import { User } from '../types';

interface ForwardSelectProps {
  allUsers: User[];
  allDivisions: string[];
  selectedUserIds: string[];
  selectedDivisions?: string[];
  onChangeUsers: (ids: string[]) => void;
  onChangeDivisions?: (divs: string[]) => void;
  allowedDivisionOnly?: string;
  label?: string;
  showDivisionSelect?: boolean;
}

export const ForwardSelect: React.FC<ForwardSelectProps> = ({
  allUsers,
  allDivisions,
  selectedUserIds,
  selectedDivisions = [],
  onChangeUsers,
  onChangeDivisions,
  allowedDivisionOnly,
  label = 'Forward To (Officers & Divisions)',
  showDivisionSelect = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'officers' | 'divisions'>('officers');
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const availableUsers = allUsers.filter((u) => {
    if (u.Status === 'Locked') return false;
    if (allowedDivisionOnly && u.Division !== allowedDivisionOnly) return false;
    return true;
  });

  const filteredUsers = availableUsers.filter((u) => {
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

  const filteredDivisions = allDivisions.filter((d) => {
    if (allowedDivisionOnly && d !== allowedDivisionOnly) return false;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return d.toLowerCase().includes(q);
  });

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChangeUsers(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChangeUsers([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeUsers(selectedUserIds.filter((id) => id !== userId));
  };

  const toggleDivision = (divisionName: string) => {
    if (!onChangeDivisions) return;
    if (selectedDivisions.includes(divisionName)) {
      onChangeDivisions(selectedDivisions.filter((d) => d !== divisionName));
    } else {
      onChangeDivisions([...selectedDivisions, divisionName]);
    }
  };

  const removeDivision = (divisionName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChangeDivisions) {
      onChangeDivisions(selectedDivisions.filter((d) => d !== divisionName));
    }
  };

  const selectedUserObjects = allUsers.filter((u) => selectedUserIds.includes(u.User_ID));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="mb-1.5 block text-xs font-bold text-gray-700">
        {label}
        {allowedDivisionOnly && (
          <span className="ml-1.5 text-xs font-normal text-blue-600">
            ({allowedDivisionOnly} only)
          </span>
        )}
      </label>

      {/* Selected Chips Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[44px] cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-xs shadow-2xs transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 hover:border-gray-400"
      >
        {selectedDivisions.length === 0 && selectedUserObjects.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400 py-1">
            <Users className="h-4 w-4 text-gray-400" />
            <span>Click to select recipient officers or divisions...</span>
          </div>
        ) : (
          <>
            {/* Division Chips */}
            {selectedDivisions.map((div) => (
              <span
                key={div}
                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-900 border border-purple-200"
              >
                <Building2 className="h-3 w-3 text-purple-700" />
                <span>Dept: {div}</span>
                <button
                  type="button"
                  onClick={(e) => removeDivision(div, e)}
                  className="ml-1 rounded-full p-0.5 hover:bg-purple-200 hover:text-purple-950"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}

            {/* Officer Chips */}
            {selectedUserObjects.map((user, uIdx) => (
              <span
                key={`${user.User_ID}-${uIdx}`}
                className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-900 border border-blue-200"
              >
                <span>{user.Name}</span>
                <span className="text-[10px] text-blue-600">({user.Division})</span>
                <button
                  type="button"
                  onClick={(e) => removeUser(user.User_ID, e)}
                  className="ml-1 rounded-full p-0.5 hover:bg-blue-200 hover:text-blue-950"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
          {/* Subtabs if division select is enabled */}
          {showDivisionSelect && onChangeDivisions && (
            <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-bold text-gray-600">
              <button
                type="button"
                onClick={() => setActiveTab('officers')}
                className={`flex-1 py-2 text-center transition ${
                  activeTab === 'officers'
                    ? 'border-b-2 border-blue-600 bg-white text-blue-800'
                    : 'hover:bg-gray-100'
                }`}
              >
                Officers ({availableUsers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('divisions')}
                className={`flex-1 py-2 text-center transition ${
                  activeTab === 'divisions'
                    ? 'border-b-2 border-purple-600 bg-white text-purple-800'
                    : 'hover:bg-gray-100'
                }`}
              >
                Entire Divisions ({allDivisions.length})
              </button>
            </div>
          )}

          {/* Search Box */}
          <div className="border-b border-gray-200 p-2.5 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  activeTab === 'divisions'
                    ? 'Search divisions (e.g. Land, Accounts)...'
                    : 'Search officer name, designation, division...'
                }
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Content Lists */}
          <div className="max-h-60 overflow-y-auto p-1.5 text-xs">
            {activeTab === 'divisions' && onChangeDivisions ? (
              filteredDivisions.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No matching divisions</div>
              ) : (
                filteredDivisions.map((div) => {
                  const isSelected = selectedDivisions.includes(div);
                  return (
                    <div
                      key={div}
                      onClick={() => toggleDivision(div)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100 ${
                        isSelected ? 'bg-purple-50 font-bold text-purple-900' : 'text-gray-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-purple-600" />
                        <span>{div}</span>
                      </div>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? 'border-purple-600 bg-purple-600 text-white'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No matching officers found</div>
            ) : (
              filteredUsers.map((user, uIdx) => {
                const isSelected = selectedUserIds.includes(user.User_ID);
                return (
                  <div
                    key={`${user.User_ID}-${uIdx}`}
                    onClick={() => toggleUser(user.User_ID)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 transition hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50 font-bold text-blue-900' : 'text-gray-800'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{user.Name}</div>
                      <div className="text-[11px] text-gray-500">
                        {user.designation || user.Role} &nbsp;•&nbsp; {user.Division}
                      </div>
                    </div>
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded border ${
                        isSelected
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
