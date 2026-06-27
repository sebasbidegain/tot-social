import type { LinkPreview } from '../../types';

export default function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  if (!preview.title && !preview.description) return null;

  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden mb-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      onClick={e => e.stopPropagation()}
    >
      {preview.image_url && (
        <img src={preview.image_url} alt="" className="w-full h-40 object-cover" loading="lazy" />
      )}
      <div className="p-3">
        {preview.site_name && (
          <p className="text-xs text-gray-400 mb-1">{preview.site_name}</p>
        )}
        {preview.title && (
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{preview.title}</p>
        )}
        {preview.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{preview.description}</p>
        )}
      </div>
    </a>
  );
}
