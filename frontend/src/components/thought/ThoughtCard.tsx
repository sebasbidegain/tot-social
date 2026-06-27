import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Thought } from '../../types';
import { timeAgo } from '../../utils/formatDate';
import { toggleLike, editThought } from '../../api/thoughts';
import { toggleBookmark } from '../../api/bookmarks';
import { toggleRepost } from '../../api/reposts';
import ContentRenderer from './ContentRenderer';
import LinkPreviewCard from './LinkPreviewCard';
import LightboxModal from '../ui/LightboxModal';
import UserListModal from '../ui/UserListModal';

interface Props {
  thought: Thought;
  onDelete?: (id: number) => void;
  currentUserId?: number;
  isThreadItem?: boolean;
}

export default function ThoughtCard({ thought, onDelete, currentUserId, isThreadItem }: Props) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(thought.is_liked);
  const [likeCount, setLikeCount] = useState(thought.like_count);
  const [bookmarked, setBookmarked] = useState(thought.is_bookmarked ?? false);
  const [reposted, setReposted] = useState(thought.is_reposted ?? false);
  const [repostCount, setRepostCount] = useState(thought.repost_count ?? 0);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(thought.content);
  const [editSaving, setEditSaving] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [showLikedBy, setShowLikedBy] = useState(false);
  const [showRepostedBy, setShowRepostedBy] = useState(false);
  const [showQuoteCompose, setShowQuoteCompose] = useState(false);
  const [quoteContent, setQuoteContent] = useState('');
  const [quoteSending, setQuoteSending] = useState(false);

  async function handleLike() {
    setLiked(!liked);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
    try { await toggleLike(thought.id); }
    catch { setLiked(liked); setLikeCount(thought.like_count); }
  }

  async function handleBookmark() {
    setBookmarked(!bookmarked);
    try { await toggleBookmark(thought.id); }
    catch { setBookmarked(bookmarked); }
  }

  async function handleRepost() {
    setReposted(!reposted);
    setRepostCount(prev => reposted ? prev - 1 : prev + 1);
    try { await toggleRepost(thought.id); }
    catch { setReposted(reposted); setRepostCount(thought.repost_count ?? 0); }
  }

  async function handleEdit() {
    if (!editContent.trim()) return;
    setEditSaving(true);
    try {
      await editThought(thought.id, editContent.trim());
      thought.content = editContent.trim();
      thought.is_edited = true;
      setEditing(false);
    } catch { /* keep editing open */ }
    finally { setEditSaving(false); }
  }

  async function handleQuoteRepost() {
    if (!quoteContent.trim()) return;
    setQuoteSending(true);
    try {
      const { createThought } = await import('../../api/thoughts');
      await createThought(quoteContent.trim(), undefined, { quotedThoughtId: thought.id });
      setShowQuoteCompose(false);
      setQuoteContent('');
    } catch { /* */ }
    finally { setQuoteSending(false); }
  }

  function handleReply() {
    navigate(`/thought/${thought.id}`);
  }

  return (
    <article className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${isThreadItem ? 'border-l-2 border-l-indigo-400 dark:border-l-indigo-500' : ''}`}>
      {/* Author header */}
      <div className="flex items-center gap-3 mb-3">
        <Link to={`/profile/${thought.author.username}`}>
          {thought.author.avatar_url ? (
            <img src={thought.author.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" width={40} height={40} loading="lazy" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
              {thought.author.display_name[0]?.toUpperCase()}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/profile/${thought.author.username}`} className="font-medium text-gray-900 dark:text-white hover:underline">
            {thought.author.display_name}
          </Link>
          <p className="text-sm text-gray-500">
            @{thought.author.username} · {timeAgo(thought.created_at)}
            {thought.is_edited && <span className="ml-1 text-gray-400">(edited)</span>}
          </p>
        </div>
        {currentUserId === thought.author.id && (
          <div className="flex gap-2">
            {!editing && (
              <button onClick={() => { setEditing(true); setEditContent(thought.content); }} className="text-gray-400 hover:text-indigo-500 text-sm">
                Edit
              </button>
            )}
            {onDelete && (
              <button onClick={() => onDelete(thought.id)} className="text-gray-400 hover:text-red-500 text-sm">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content or edit form */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 resize-none min-h-[80px] outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={5000}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleEdit} disabled={editSaving} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm disabled:opacity-50">
              {editSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-sm">
              Cancel
            </button>
            <span className="text-xs text-gray-400 self-center ml-auto">{editContent.length}/5000</span>
          </div>
        </div>
      ) : (
        <Link to={`/thought/${thought.id}`}>
          <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words mb-3">
            <ContentRenderer content={thought.content} />
          </div>
        </Link>
      )}

      {/* Quoted thought */}
      {thought.quoted_thought && (
        <Link to={`/thought/${thought.quoted_thought.id}`} className="block border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-2 mb-1">
            {thought.quoted_thought.author.avatar_url ? (
              <img src={thought.quoted_thought.author.avatar_url} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center">
                {thought.quoted_thought.author.display_name[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{thought.quoted_thought.author.display_name}</span>
            <span className="text-xs text-gray-400">@{thought.quoted_thought.author.username}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            <ContentRenderer content={thought.quoted_thought.content} />
          </p>
        </Link>
      )}

      {/* Link preview */}
      {thought.link_preview && <LinkPreviewCard preview={thought.link_preview} />}

      {/* Media */}
      {thought.media.length > 0 && (
        <div className={`grid gap-2 mb-3 ${thought.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {thought.media.map((m, idx) => (
            m.type === 'image' ? (
              <img key={m.id} src={m.url} alt="" className="rounded-lg w-full object-cover max-h-96 cursor-pointer" loading="lazy" width={600} height={400}
                onClick={(e) => { e.preventDefault(); setLightboxIdx(idx); }} />
            ) : (
              <video key={m.id} src={m.url} controls className="rounded-lg w-full max-h-96" poster={m.thumbnail_url} />
            )
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <LightboxModal
          media={thought.media.filter(m => m.type === 'image')}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 text-sm flex-wrap">
        <button onClick={handleLike} className={`flex items-center gap-1 hover:text-red-500 transition-colors ${liked ? 'text-red-500' : ''}`}>
          {liked ? '♥' : '♡'}
          <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); setShowLikedBy(true); }}>{likeCount}</span>
        </button>
        <button onClick={handleReply} className="flex items-center gap-1 hover:text-indigo-500">
          💬 {thought.comment_count + (thought.reply_count || 0)}
        </button>
        <div className="flex items-center gap-1">
          <button onClick={handleRepost} className={`hover:text-green-500 transition-colors ${reposted ? 'text-green-500' : ''}`}>
            🔄
          </button>
          <span className="cursor-pointer hover:underline" onClick={() => setShowRepostedBy(true)}>{repostCount}</span>
          <button onClick={() => setShowQuoteCompose(!showQuoteCompose)} className="ml-1 hover:text-green-500 text-xs" title="Quote">
            ✍
          </button>
        </div>
        <button onClick={handleBookmark} className={`flex items-center gap-1 hover:text-yellow-500 transition-colors ${bookmarked ? 'text-yellow-500' : ''}`}>
          {bookmarked ? '★' : '☆'}
        </button>
      </div>

      {/* Quote compose */}
      {showQuoteCompose && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <textarea
            value={quoteContent}
            onChange={e => setQuoteContent(e.target.value)}
            placeholder="Add your thoughts..."
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg p-2 resize-none min-h-[60px] text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            maxLength={5000}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleQuoteRepost} disabled={quoteSending || !quoteContent.trim()} className="px-3 py-1 bg-green-600 text-white rounded text-sm disabled:opacity-50">
              {quoteSending ? '...' : 'Quote'}
            </button>
            <button onClick={() => { setShowQuoteCompose(false); setQuoteContent(''); }} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Who liked / reposted modals */}
      {showLikedBy && (
        <UserListModal title="Liked by" thoughtId={thought.id} type="liked-by" onClose={() => setShowLikedBy(false)} />
      )}
      {showRepostedBy && (
        <UserListModal title="Reposted by" thoughtId={thought.id} type="reposted-by" onClose={() => setShowRepostedBy(false)} />
      )}
    </article>
  );
}
