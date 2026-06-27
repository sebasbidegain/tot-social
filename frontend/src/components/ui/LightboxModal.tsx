import { useState, useEffect, useCallback } from 'react';
import type { Media } from '../../types';

interface Props {
  media: Media[];
  initialIndex: number;
  onClose: () => void;
}

export default function LightboxModal({ media, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1));
    if (e.key === 'ArrowRight') setIndex(i => Math.min(media.length - 1, i + 1));
  }, [media.length, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10" onClick={onClose}>
        &times;
      </button>

      {media.length > 1 && index > 0 && (
        <button
          className="absolute left-4 text-white text-4xl hover:text-gray-300 z-10"
          onClick={e => { e.stopPropagation(); setIndex(i => i - 1); }}
        >
          &#8249;
        </button>
      )}

      <img
        src={media[index].url}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={e => e.stopPropagation()}
      />

      {media.length > 1 && index < media.length - 1 && (
        <button
          className="absolute right-4 text-white text-4xl hover:text-gray-300 z-10"
          onClick={e => { e.stopPropagation(); setIndex(i => i + 1); }}
        >
          &#8250;
        </button>
      )}

      {media.length > 1 && (
        <div className="absolute bottom-4 text-white text-sm">
          {index + 1} / {media.length}
        </div>
      )}
    </div>
  );
}
