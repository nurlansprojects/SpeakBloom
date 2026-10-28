import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { TeacherApplication, UserProfile } from '../../types';
import { Users, FileText, Check, X, Shield, ChevronRight } from 'lucide-react';

export const AdminOverview: React.FC = () => {
  const navigate = useNavigate();
  const [studentCount, setStudentCount] = useState(0);
  const [teacherCount, setTeacherCount] = useState(0);
  const [applications, setApplications] = useState<TeacherApplication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Count students and teachers
    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snapshot) => {
      let stCount = 0;
      let tcCount = 0;
      snapshot.forEach((d) => {
        const u = d.data() as UserProfile;
        if (u.role === 'teacher') tcCount++;
        else if (u.role === 'student') stCount++;
      });
      setStudentCount(stCount);
      setTeacherCount(tcCount);
    });

    // Realtime applications list
    const appsRef = collection(db, 'teacherApplications');
    const appsQuery = query(appsRef, where('status', 'in', ['submitted', 'review']));
    const unsubApps = onSnapshot(
      appsQuery,
      (snapshot) => {
        const list: TeacherApplication[] = [];
        snapshot.forEach((d) => {
          list.push({ uid: d.id, ...d.data() } as TeacherApplication);
        });
        setApplications(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'teacherApplications');
        setLoading(false);
      }
    );

    return () => {
      unsubUsers();
      unsubApps();
    };
  }, []);

  const handleApproveTeacher = async (app: TeacherApplication) => {
    try {
      // 1. Update user role in users collection
      await updateDoc(doc(db, 'users', app.uid), {
        role: 'teacher',
      });

      // 2. Update application status
      await updateDoc(doc(db, 'teacherApplications', app.uid), {
        status: 'approved',
        reviewedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${app.uid}`);
    }
  };

  const handleDeclineTeacher = async (app: TeacherApplication) => {
    try {
      await updateDoc(doc(db, 'teacherApplications', app.uid), {
        status: 'declined',
        reviewedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teacherApplications/${app.uid}`);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Title (Matches PDF Page 7: "Admin") */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
        Admin
      </h1>

      {/* Metrics Row (Matches PDF Page 7: Students, Teachers) */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm">
          <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] font-medium">
            Students
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1530] dark:text-white mt-1">
            {studentCount}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm">
          <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] font-medium">
            Teachers
          </p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1530] dark:text-white mt-1">
            {teacherCount}
          </p>
        </div>
      </div>

      {/* Teacher Applications Section (Matches PDF Page 7) */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-[#1C1530] dark:text-white">
          Teacher applications
        </h2>

        {applications.length === 0 ? (
          <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center text-xs text-[#5B5470]">
            No pending teacher applications right now.
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.uid}
                className="p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1530] dark:text-white">
                      {app.displayName}
                    </h3>
                    <p className="text-xs text-[#5B5470]">
                      Applied recently · {app.email}
                    </p>
                    {app.reason && (
                      <p className="text-xs text-[#1C1530] dark:text-[#f3f0fc] mt-1.5 line-clamp-2">
                        "{app.reason}"
                      </p>
                    )}
                  </div>
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9]">
                    Student
                  </span>
                </div>

                {/* Decline & Make teacher action buttons (Matches PDF Page 7) */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDeclineTeacher(app)}
                    className="flex-1 py-2 text-xs font-semibold text-[#5B5470] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] hover:bg-slate-50 rounded-[12px] transition-colors"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleApproveTeacher(app)}
                    className="flex-1 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[12px] transition-colors"
                  >
                    Make teacher
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Give admin role shortcut row (Matches PDF Page 7) */}
      <div
        onClick={() => navigate('/admin/users')}
        className="cursor-pointer flex items-center justify-between p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center">
            <Shield size={20} strokeWidth={2} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1C1530] dark:text-white">
              Manage User Roles
            </h3>
            <p className="text-xs text-[#5B5470]">
              Students, teachers, or administrators
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-[#5B5470]" />
      </div>
    </div>
  );
};
