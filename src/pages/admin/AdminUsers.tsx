import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { UserProfile, UserRole } from '../../types';
import { Search, User, Shield, Check, X } from 'lucide-react';

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'admins'>('students');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          list.push({ uid: d.id, ...d.data() } as UserProfile);
        });
        setUsers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    );

    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) => {
    const roleMatches =
      activeTab === 'students'
        ? u.role === 'student'
        : activeTab === 'teachers'
        ? u.role === 'teacher'
        : u.role === 'admin';

    const searchMatches =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase());

    return roleMatches && searchMatches;
  });

  const handleOpenRoleModal = (u: UserProfile) => {
    setSelectedUser(u);
    setNewRole(u.role);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        role: newRole,
      });
      setSelectedUser(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${selectedUser.uid}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Title (Matches PDF Page 11: "Users") */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
        Users
      </h1>

      {/* Search Input (Matches PDF Page 11: "Search name or email") */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B5470]"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search name or email"
          className="w-full pl-10 pr-4 py-3 text-sm rounded-[14px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
        />
      </div>

      {/* Segmented Control Tabs (Matches PDF Page 11: "Students | Teachers | Admins") */}
      <div className="flex items-center p-1 bg-[#EDE5FF]/50 dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c]">
        {(['students', 'teachers', 'admins'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-semibold rounded-[10px] capitalize transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-[#18122b] text-[#6D28D9] dark:text-[#a78bfa] shadow-xs'
                : 'text-[#5B5470] hover:text-[#1C1530]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Users List (Matches PDF Page 11) */}
      <div className="space-y-2.5">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-xs text-[#5B5470]">
            No users found in this category.
          </div>
        ) : (
          filteredUsers.map((u) => {
            const initials = u.displayName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <div
                key={u.uid}
                onClick={() => handleOpenRoleModal(u)}
                className="cursor-pointer flex items-center justify-between p-3.5 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {initials || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#1C1530] dark:text-white truncate">
                      {u.displayName}
                    </h3>
                    <p className="text-xs text-[#5B5470] truncate">
                      {u.email}
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa] capitalize">
                  {u.role}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Change Role Bottom Drawer / Modal (Matches PDF Page 11) */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#18122b] rounded-t-[24px] sm:rounded-[18px] p-6 space-y-5 shadow-2xl border border-[#E6E0F5] dark:border-[#2e234c]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
                  Change role: {selectedUser.displayName}
                </h3>
                <p className="text-xs text-[#5B5470] mt-0.5">
                  {selectedUser.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 text-[#5B5470]"
              >
                <X size={20} />
              </button>
            </div>

            {/* Segmented Role Chooser (Matches PDF Page 11: "Student | Teacher | Admin") */}
            <div className="flex items-center p-1 bg-[#EDE5FF]/50 dark:bg-[#201838] rounded-[14px]">
              {(['student', 'teacher', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNewRole(r)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-[10px] capitalize transition-all ${
                    newRole === r
                      ? 'bg-white dark:bg-[#18122b] text-[#6D28D9] dark:text-[#a78bfa] shadow-xs'
                      : 'text-[#5B5470] hover:text-[#1C1530]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Save Role Button (Matches PDF Page 11: "Save role") */}
            <button
              onClick={handleSaveRole}
              disabled={saving}
              className="w-full min-h-[52px] sm:min-h-[44px] flex items-center justify-center bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm rounded-[14px] shadow-sm transition-all"
            >
              {saving ? 'Updating...' : 'Save role'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
