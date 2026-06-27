import { useState, useRef, type FormEvent } from 'react';
import { createThought } from '../../api/thoughts';
import { MAX_THOUGHT_LENGTH } from '../../utils/constants';

interface Props {
  onCreated?: () => void;
  parentThoughtId?: number;
  quotedThoughtId?: number;
}

export default function ComposeForm({ onCreated, parentThoughtId, quotedThoughtId }: Props) {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const charPercent = Math.min(100, (content.length / MAX_THOUGHT_LENGTH) * 100);
  const isOverLimit = content.length > MAX_THOUGHT_LENGTH;
  const isNearLimit = content.length > MAX_THOUGHT_LENGTH * 0.9;

  function handleFiles(selected: FileList | null) {
    if (!selected) return;
    const newFiles = Array.from(selected);
    const isVideo = newFiles.some(f => f.type.startsWith('video/'));

    if (isVideo && newFiles.length > 1) {
      setError('Only one video per thought');
      return;
    }
    if (!isVideo && newFiles.length > 4) {
      setError('Maximum 4 images per thought');
      return;
    }

    setFiles(newFiles);
    setPreviews(newFiles.map(f => URL.createObjectURL(f)));
    setError('');
  }

  function removeFile(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if ((!content.trim() && files.length === 0) || isOverLimit) return;

    setLoading(true);
    setError('');
    try {
      await createThought(content.trim(), files.length > 0 ? files : undefined, {
        parentThoughtId: parentThoughtId,
        quotedThoughtId: quotedThoughtId,
      });
      setContent('');
      setFiles([]);
      previews.forEach(p => URL.revokeObjectURL(p));
      setPreviews([]);
      onCreated?.();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post');
    } finally {
      setLoading(false);
    }
  }

  const placeholder = parentThoughtId ? 'Write your reply...' : 'What\'s on your mind?';
  const buttonText = parentThoughtId ? 'Reply' : 'Post';

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none border-none outline-none text-gray-800 dark:text-gray-200 dark:bg-gray-800 placeholder-gray-400 min-h-[80px]"
        maxLength={MAX_THOUGHT_LENGTH + 100}
      />

      {previews.length > 0 && (
        <div className={`grid gap-2 mb-3 ${previews.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {previews.map((url, i) => (
            <div key={i} className="relative">
              {files[i]?.type.startsWith('video/') ? (
                <video src={url} className="rounded-lg w-full max-h-48 object-cover" />
              ) : (
                <img src={url} alt="" className="rounded-lg w-full max-h-48 object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center hover:bg-black/70"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

      <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
        <div className="flex gap-3 items-center">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
            multiple
            onChange={e => handleFiles(e.target.files)}
            className="hidden"
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="text-gray-400 hover:text-indigo-500 text-sm">
            📎 Media
          </button>

          {/* Character counter with circular indicator */}
          <div className="flex items-center gap-1.5">
            <svg width="20" height="20" viewBox="0 0 20 20" className="transform -rotate-90">
              <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-600" strokeWidth="2" />
              <circle
                cx="10" cy="10" r="8" fill="none"
                stroke={isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#6366F1'}
                strokeWidth="2"
                strokeDasharray={`${2 * Math.PI * 8}`}
                strokeDashoffset={`${2 * Math.PI * 8 * (1 - charPercent / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <span className={`text-xs ${isOverLimit ? 'text-red-500 font-medium' : isNearLimit ? 'text-amber-500' : 'text-gray-400'}`}>
              {isNearLimit ? MAX_THOUGHT_LENGTH - content.length : ''}
            </span>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || (!content.trim() && files.length === 0) || isOverLimit}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Posting...' : buttonText}
        </button>
      </div>
    </form>
  );
}
