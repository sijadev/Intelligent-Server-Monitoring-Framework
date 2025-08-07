import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${title} - MCP.Guard Dashboard`;
    
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}