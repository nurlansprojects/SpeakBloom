import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { InAppNotification } from '../../types';
import { Bell, Check, ChevronLeft } from 'lucide-react';

export const NotificationsScreen: React.FC = () => {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;

    const notifsRef = collection(db, 'notifications');
    const q = query(
      notifsRef,
      where('recipientId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: InAppNotification[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as InAppNotification);
        });
        setNotifications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const handleMarkRead = async (notif: InAppNotification) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (e) {
      console.warn('Could not mark read:', e);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 text-[#5B5470] hover:text-[#1C1530]"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1530] dark:text-white">
          Notifications
        </h1>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-xs text-[#5B5470]">
            <Bell size={28} className="mx-auto text-[#6D28D9] mb-2" />
            <p className="font-semibold text-sm text-[#1C1530] dark:text-white">
              No new alerts
            </p>
            <p className="mt-1">You will receive notifications for reviews and comments here.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleMarkRead(notif)}
              className={`cursor-pointer p-4 rounded-[18px] border transition-all ${
                notif.read
                  ? 'bg-white dark:bg-[#18122b] border-[#E6E0F5] dark:border-[#2e234c]'
                  : 'bg-[#EDE5FF]/60 dark:bg-[#201838] border-[#8B5CF6]'
              }`}
            >
              <div className="flex items-start justify-between">
                <h2 className="text-sm font-bold text-[#1C1530] dark:text-white">
                  {notif.title}
                </h2>
                {!notif.read && (
                  <span className="w-2 h-2 rounded-full bg-[#6D28D9] mt-1" />
                )}
              </div>
              <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-1 leading-relaxed">
                {notif.body}
              </p>
              <span className="text-[10px] text-[#5B5470] mt-2 block">
                {new Date(notif.createdAt).toLocaleString()}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
