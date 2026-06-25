'use client';

import { useState, useEffect, useCallback } from 'react';
import { generateSessionId } from '@/lib/utils';
import { SESSION_HEADER } from '@/lib/constants';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('userpath-session-id');
    if (!id) {
      id = generateSessionId();
      localStorage.setItem('userpath-session-id', id);
    }
    return id;
  } catch {
    try {
      let id = sessionStorage.getItem('userpath-session-id');
      if (!id) {
        id = generateSessionId();
        sessionStorage.setItem('userpath-session-id', id);
      }
      return id;
    } catch {
      return generateSessionId();
    }
  }
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = getOrCreateSessionId();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(id);
    setReady(true);
  }, []);

  const getHeaders = useCallback((): HeadersInit => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sessionId) {
      headers[SESSION_HEADER] = sessionId;
    }
    return headers;
  }, [sessionId]);

  return { sessionId: sessionId ?? '', ready, getHeaders };
}
