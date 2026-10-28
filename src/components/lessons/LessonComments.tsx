import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { CommentItem } from '../../types';
import { Send, CornerDownRight, MoreVertical, Trash2, Flag, Edit2, MessageCircle } from 'lucide-react';

interface LessonCommentsProps {
  lessonId: string;
  teacherId?: string;
}

export const LessonComments: React.FC<LessonCommentsProps> = ({ lessonId, teacherId }) => {
  const { profile, firebaseUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const commentsRef = collection(db, 'lessons', lessonId, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: CommentItem[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as CommentItem);
        });
        setComments(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `lessons/${lessonId}/comments`);
      }
    );

    return () => unsubscribe();
  }, [lessonId]);

  const handlePostComment = async (parentId?: string) => {
    if (!firebaseUser || !profile) return;
    const textToSubmit = parentId ? replyText.trim() : newCommentText.trim();
    if (!textToSubmit) return;

    if (textToSubmit.length > 1000) {
      alert('Comments are limited to 1,000 characters.');
      return;
    }

    try {
      setSubmitting(true);
      const commentsRef = collection(db, 'lessons', lessonId, 'comments');
      await addDoc(commentsRef, {
        lessonId,
        authorId: firebaseUser.uid,
        authorName: profile.displayName || 'Learner',
        authorUsername: profile.username || 'user',
        authorPhoto: profile.photoURL || '',
        authorRole: profile.role || 'student',
        text: textToSubmit,
        parentId: parentId || null,
        createdAt: new Date().toISOString(),
        deleted: false,
        reportCount: 0,
      });

      if (parentId) {
        setReplyToId(null);
        setReplyText('');
      } else {
        setNewCommentText('');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `lessons/${lessonId}/comments`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const docRef = doc(db, 'lessons', lessonId, 'comments', commentId);
      await updateDoc(docRef, {
        text: editText.trim(),
        editedAt: new Date().toISOString(),
      });
      setEditingId(null);
      setEditText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}/comments/${commentId}`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const docRef = doc(db, 'lessons', lessonId, 'comments', commentId);
      await updateDoc(docRef, {
        deleted: true,
        text: '[This comment has been removed]',
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}/comments/${commentId}`);
    }
  };

  const handleUserClick = (otherUid: string) => {
    if (otherUid === firebaseUser?.uid) {
      navigate('/profile');
    } else {
      // Direct message conversation link per requirement
      navigate(`/messages/${otherUid}`);
    }
  };

  const rootComments = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => !!c.parentId);

  const sortedRootComments = [...rootComments].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-6 pt-6 border-t border-[#E6E0F5] dark:border-[#2e234c]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#1C1530] dark:text-white">
          Discussion ({comments.filter((c) => !c.deleted).length})
        </h3>
        <button
          onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
          className="text-xs font-semibold text-[#6D28D9] dark:text-[#a78bfa] hover:underline"
        >
          {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
        </button>
      </div>

      {/* Post comment input box */}
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs shrink-0">
          {profile?.displayName?.slice(0, 2).toUpperCase() || 'SB'}
        </div>
        <div className="flex-1 space-y-2">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Ask a question or share speaking practice thoughts..."
            rows={2}
            maxLength={1000}
            className="w-full p-3 text-sm rounded-[14px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#8B5CF6]"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[#5B5470]">
              {newCommentText.length} / 1000 characters
            </span>
            <button
              onClick={() => handlePostComment()}
              disabled={submitting || !newCommentText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[10px] disabled:opacity-50 transition-colors"
            >
              <Send size={14} strokeWidth={2} />
              <span>Post Comment</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {sortedRootComments.map((comment) => {
          const isAuthor = firebaseUser?.uid === comment.authorId;
          const canDelete = isAuthor || firebaseUser?.uid === teacherId || isAdmin;
          const commentReplies = replies.filter((r) => r.parentId === comment.id);

          return (
            <div
              key={comment.id}
              className="p-4 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div
                  onClick={() => handleUserClick(comment.authorId)}
                  className="flex items-center gap-2.5 cursor-pointer group"
                >
                  {comment.authorPhoto ? (
                    <img
                      src={comment.authorPhoto}
                      alt={comment.authorName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-xs">
                      {comment.authorName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#1C1530] dark:text-white group-hover:text-[#6D28D9]">
                        {comment.authorName}
                      </span>
                      {comment.authorRole && comment.authorRole !== 'student' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded bg-[#EDE5FF] text-[#6D28D9]">
                          {comment.authorRole}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5B5470]">
                      @{comment.authorUsername} · {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUserClick(comment.authorId)}
                    className="p-1.5 text-xs text-[#6D28D9] hover:bg-[#EDE5FF] rounded-lg transition-colors flex items-center gap-1"
                    title="Direct Message"
                  >
                    <MessageCircle size={14} strokeWidth={1.8} />
                    <span className="hidden sm:inline">Message</span>
                  </button>

                  {isAuthor && !comment.deleted && (
                    <button
                      onClick={() => {
                        setEditingId(comment.id);
                        setEditText(comment.text);
                      }}
                      className="p-1.5 text-[#5B5470] hover:text-[#1C1530] rounded-lg"
                      title="Edit comment"
                    >
                      <Edit2 size={14} strokeWidth={1.8} />
                    </button>
                  )}

                  {canDelete && !comment.deleted && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Delete comment"
                    >
                      <Trash2 size={14} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              </div>

              {/* Text content or Edit field */}
              {editingId === comment.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    className="w-full p-2.5 text-xs rounded-lg border border-[#8B5CF6] bg-[#F7F4FF] dark:bg-[#201838]"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs text-[#5B5470]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(comment.id)}
                      className="px-3 py-1 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`text-xs sm:text-sm text-[#1C1530] dark:text-[#f3f0fc] ${comment.deleted ? 'italic text-[#5B5470]' : ''}`}>
                  {comment.text}
                  {comment.editedAt && !comment.deleted && (
                    <span className="text-[10px] text-[#5B5470] ml-1.5">(edited)</span>
                  )}
                </p>
              )}

              {/* Reply Button */}
              {!comment.deleted && (
                <div className="pt-1">
                  <button
                    onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6D28D9] hover:underline"
                  >
                    <CornerDownRight size={12} strokeWidth={2} />
                    <span>Reply</span>
                  </button>
                </div>
              )}

              {/* Reply Input Bar */}
              {replyToId === comment.id && (
                <div className="flex gap-2 pt-2 border-t border-[#E6E0F5] dark:border-[#2e234c]">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838]"
                  />
                  <button
                    onClick={() => handlePostComment(comment.id)}
                    disabled={submitting || !replyText.trim()}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg"
                  >
                    Reply
                  </button>
                </div>
              )}

              {/* Nested replies */}
              {commentReplies.length > 0 && (
                <div className="pl-4 sm:pl-6 space-y-2.5 pt-2 border-l-2 border-[#E6E0F5] dark:border-[#2e234c]">
                  {commentReplies.map((reply) => (
                    <div key={reply.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div
                          onClick={() => handleUserClick(reply.authorId)}
                          className="flex items-center gap-2 cursor-pointer group"
                        >
                          <span className="text-xs font-bold text-[#1C1530] dark:text-white group-hover:text-[#6D28D9]">
                            {reply.authorName}
                          </span>
                          <span className="text-[10px] text-[#5B5470]">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        {(firebaseUser?.uid === reply.authorId || isAdmin) && !reply.deleted && (
                          <button
                            onClick={() => handleDeleteComment(reply.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 size={12} strokeWidth={1.8} />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[#1C1530] dark:text-[#f3f0fc]">
                        {reply.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
