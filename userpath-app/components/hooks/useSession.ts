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
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSessionId(getOrCreateSessionId());
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

  return { sessionId, getHeaders };
}
