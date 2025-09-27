import { useEffect } from 'react';

/**
 * Sets document.title with standard suffix.
 * Usage: useDocumentTitle('Moderator Guide') -> 'Moderator Guide - GroWith'
 */
export function useDocumentTitle(title: string | undefined, options?: { skipSuffix?: boolean }) {
  useEffect(() => {
    if (!title) return;
    const suffix = 'GroWith';
    document.title = options?.skipSuffix ? title : `${title} - ${suffix}`;
    return () => { /* no-op cleanup */ };
  }, [title, options?.skipSuffix]);
}
