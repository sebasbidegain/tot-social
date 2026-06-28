import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ADSENSE_CLIENT, ADS_ENABLED, SHOW_PLACEHOLDERS } from '../config/ads';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
    __adsenseLoaded?: boolean;
  }
}

function ensureAdScript() {
  if (window.__adsenseLoaded) return;
  window.__adsenseLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  s.crossOrigin = 'anonymous';
  document.head.appendChild(s);
}

interface Props {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export default function AdBanner({ slot, format = 'auto', className = '' }: Props) {
  const location = useLocation();
  const pushed = useRef(false);
  const isRectangle = format === 'rectangle';

  useEffect(() => {
    if (!ADS_ENABLED) return;
    ensureAdScript();
    if (pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* adsbygoogle not ready */ }
  }, [location.pathname, slot]);

  if (!ADS_ENABLED) {
    if (!SHOW_PLACEHOLDERS) return null;
    return (
      <div className={`ad-slot w-full ${className}`} aria-label="Advertisement">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center mb-1">Advertisement</div>
        <div
          className="mx-auto rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500"
          style={isRectangle ? { width: 300, height: 250 } : undefined}
        >
          <div className={isRectangle ? '' : 'w-full max-w-[728px] h-[90px] flex items-center justify-center'}>
            Ad · {slot}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-slot w-full overflow-hidden ${className}`} aria-label="Advertisement">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 dark:text-gray-500 text-center mb-1">Advertisement</div>
      {isRectangle ? (
        <ins
          key={location.pathname + slot}
          className="adsbygoogle"
          style={{ display: 'inline-block', width: 300, height: 250 }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
        />
      ) : (
        <ins
          key={location.pathname + slot}
          className="adsbygoogle"
          style={{ display: 'block', minHeight: 90, maxWidth: 728, margin: '0 auto' }}
          data-ad-client={ADSENSE_CLIENT}
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive="true"
        />
      )}
    </div>
  );
}
