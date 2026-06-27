import { useRef, useEffect, useCallback } from 'react';

export function useInfiniteScroll(
  fetchNext: () => void,
  hasMore: boolean,
  isLoading: boolean
) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        fetchNext();
      }
    },
    [fetchNext, hasMore, isLoading]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleObserver, {
      rootMargin: '200px',
    });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleObserver]);

  return sentinelRef;
}
