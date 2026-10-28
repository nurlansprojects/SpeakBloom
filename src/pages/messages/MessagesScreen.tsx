import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Conversation, DirectMessage, UserProfile } from '../../types';
import { Send, Search, MessageSquare, Shield, CheckCheck, User, Plus } from 'lucide-react';

export const MessagesScreen: React.FC = () => {
  const { otherUserId } = useParams<{ otherUserId?: string }>();
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive deterministic conversation ID from sorted UIDs
  const getConvId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('_');
  };

  const activeConvId =
    firebaseUser && otherUserId ? getConvId(firebaseUser.uid, otherUserId) : null;

  // Realtime conversations list
  useEffect(() => {
    if (!firebaseUser) return;

    const convsRef = collection(db, 'conversations');
    const q = query(
      convsRef,
      where('participants', 'array-contains', firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Conversation);
        });
        setConversations(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'conversations');
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  // Load active partner info
  useEffect(() => {
    if (!otherUserId) {
      setActivePartner(null);
      return;
    }

    const loadPartner = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', otherUserId));
        if (userSnap.exists()) {
          setActivePartner(userSnap.data() as UserProfile);
        } else {
          setActivePartner({
            uid: otherUserId,
            displayName: 'User',
            username: 'user',
            usernameLower: 'user',
            email: '',
            role: 'student',
            createdAt: new Date().toISOString(),
            streak: 1,
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${otherUserId}`);
      }
    };

    loadPartner();
  }, [otherUserId]);

  // Realtime messages in active conversation
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }

    const msgsRef = collection(db, 'conversations', activeConvId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: DirectMessage[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as DirectMessage);
        });
        setMessages(list);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `conversations/${activeConvId}/messages`);
      }
    );

    return () => unsubscribe();
  }, [activeConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !otherUserId || !inputText.trim() || sending) return;

    const text = inputText.trim();
    if (text.length > 2000) return;

    try {
      setSending(true);
      const convId = getConvId(firebaseUser.uid, otherUserId);

      // Ensure conversation doc exists
      await setDoc(
        doc(db, 'conversations', convId),
        {
          id: convId,
          participants: [firebaseUser.uid, otherUserId],
          lastMessage: text,
          lastMessageAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Add message
      await addDoc(collection(db, 'conversations', convId, 'messages'), {
        conversationId: convId,
        senderId: firebaseUser.uid,
        senderName: profile?.displayName || 'User',
        text,
        createdAt: new Date().toISOString(),
      });

      setInputText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `conversations/${activeConvId}/messages`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[78vh] bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] overflow-hidden flex flex-col md:flex-row shadow-sm">
      {/* Left Pane: Conversations List */}
      <div
        className={`w-full md:w-80 border-r border-[#E6E0F5] dark:border-[#2e234c] flex flex-col ${
          otherUserId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-4 border-b border-[#E6E0F5] dark:border-[#2e234c] space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-[#1C1530] dark:text-white">
              Messages
            </h1>
          </div>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B5470]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-[10px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none"
            />
          </div>
        </div>

        {/* Conversations Scrollable List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#E6E0F5] dark:divide-[#2e234c]">
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5B5470]">
              No messages yet. Tap a user's name in lesson discussions to start a chat.
            </div>
          ) : (
            conversations.map((conv) => {
              const partnerUid = conv.participants.find((p) => p !== firebaseUser?.uid);
              const isSelected = partnerUid === otherUserId;

              return (
                <div
                  key={conv.id}
                  onClick={() => partnerUid && navigate(`/messages/${partnerUid}`)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#EDE5FF] dark:bg-[#201838]'
                      : 'hover:bg-[#F7F4FF] dark:hover:bg-[#201838]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <User size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#1C1530] dark:text-white truncate">
                      Chat with partner
                    </p>
                    <p className="text-xs text-[#5B5470] truncate mt-0.5">
                      {conv.lastMessage || 'New conversation'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Room */}
      <div
        className={`flex-1 flex flex-col bg-[#F7F4FF]/40 dark:bg-[#0f0a1c]/40 ${
          !otherUserId ? 'hidden md:flex items-center justify-center' : 'flex'
        }`}
      >
        {otherUserId && activePartner ? (
          <>
            {/* Chat Room Header */}
            <div className="p-4 bg-white dark:bg-[#18122b] border-b border-[#E6E0F5] dark:border-[#2e234c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/messages')}
                  className="md:hidden text-xs font-semibold text-[#6D28D9]"
                >
                  ‹ Back
                </button>
                <div className="w-9 h-9 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs">
                  {activePartner.displayName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xs font-bold text-[#1C1530] dark:text-white">
                    {activePartner.displayName}
                  </h2>
                  <p className="text-[11px] text-[#5B5470]">
                    @{activePartner.username} · {activePartner.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Stream Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-[#5B5470]">
                  Send a message to start conversing about English speaking topics.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === firebaseUser?.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] p-3 text-xs leading-relaxed rounded-[16px] ${
                          isMine
                            ? 'bg-[#6D28D9] text-white rounded-br-xs shadow-sm'
                            : 'bg-white dark:bg-[#18122b] text-[#1C1530] dark:text-[#f3f0fc] border border-[#E6E0F5] dark:border-[#2e234c] rounded-bl-xs'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span
                          className={`block text-[10px] mt-1 text-right ${
                            isMine ? 'text-purple-200' : 'text-[#5B5470]'
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-white dark:bg-[#18122b] border-t border-[#E6E0F5] dark:border-[#2e234c] flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                maxLength={2000}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-[12px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-2.5 bg-[#6D28D9] text-white rounded-[12px] hover:bg-[#5B21B6] disabled:opacity-50 transition-colors"
                aria-label="Send message"
              >
                <Send size={16} strokeWidth={2} />
              </button>
            </form>
          </>
        ) : (
          <div className="text-center p-8 text-xs text-[#5B5470] space-y-2">
            <MessageSquare size={32} className="mx-auto text-[#6D28D9]" />
            <p className="font-semibold text-sm text-[#1C1530] dark:text-white">
              No conversation selected
            </p>
            <p>Choose a discussion partner from the left pane to chat.</p>
          </div>
        )}
      </div>
    </div>
  );
};
