import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Users } from 'lucide-react';
import { User } from '../types';

interface ForwardUserSelectProps {
  allUsers: User[];
  selectedUserIds: string[];
  onChange: (ids: string[]) => void;
  allowedDivisionOnly?: string; // If provided (e.g. for Normal user), restrict only to this division
  label?: string;
}

export const ForwardUserSelect: React.FC<ForwardUserSelectProps> = ({
  allUsers,
  selectedUserIds,
  onChange,
  allowedDivisionOnly,
  label = 'அனுப்பப்பட வேண்டியவர்கள் (Forwarded to)',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users
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
      u.Role.toLowerCase().includes(q)
    );
  });

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedUserIds, userId]);
    }
  };

  const removeUser = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedUserIds.filter((id) => id !== userId));
  };

  const selectedObjects = allUsers.filter((u) => selectedUserIds.includes(u.User_ID));

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <label className="mb-1 block text-xs font-bold text-gray-700">
        {label}
        {allowedDivisionOnly && (
          <span className="ml-1.5 text-xs font-normal text-blue-600">
            ({allowedDivisionOnly} மட்டும்)
          </span>
        )}
      </label>

      {/* Selected chips & trigger container */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-[42px] cursor-pointer flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white p-2 text-sm shadow-xs transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 hover:border-gray-400"
      >
        {selectedObjects.length === 0 ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="h-4 w-4" />
            <span>உத்தியோகத்தர்களைத் தெரிவு செய்ய கிளிக் செய்க...</span>
          </div>
        ) : (
          selectedObjects.map((user) => (
            <span
              key={user.User_ID}
              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800 border border-blue-200"
            >
              <span>{user.Name}</span>
              <span className="text-blue-500">({user.Role})</span>
              <button
                type="button"
                onClick={(e) => removeUser(user.User_ID, e)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 hover:text-blue-900"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Dropdown Menu with Search */}
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          {/* Search Box */}
          <div className="border-b border-gray-200 p-2 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="பெயர், ID, அல்லது பிரிவு மூலம் தேடுக..."
                className="w-full rounded-md border border-gray-300 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-800 focus:border-blue-500 focus:outline-hidden"
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

          {/* User List */}
          <div className="max-h-56 overflow-y-auto p-1 text-xs">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                உத்தியோகத்தர்கள் எவரும் பொருந்தவில்லை
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isSelected = selectedUserIds.includes(user.User_ID);
                return (
                  <div
                    key={user.User_ID}
                    onClick={() => toggleUser(user.User_ID)}
                    className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 transition hover:bg-gray-100 ${
                      isSelected ? 'bg-blue-50/70 font-semibold text-blue-900' : 'text-gray-700'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-gray-900">{user.Name}</div>
                      <div className="text-[11px] text-gray-500">
                        ID: {user.User_ID} &nbsp;|&nbsp; பிரிவு: {user.Division} &nbsp;|&nbsp;{' '}
                        <span className="text-blue-700">{user.Role}</span>
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
