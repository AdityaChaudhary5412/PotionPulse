import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { SurgeEvent } from '../types';

interface CurseContextType {
  isCurseMode: boolean;
  toggleCurseMode: () => Promise<void>;
  curseEvent: SurgeEvent | null;
  loading: boolean;
  error: string | null;
  curseMultiplier: number;
}

const CurseContext = createContext<CurseContextType | undefined>(undefined);

export const CurseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCurseMode, setIsCurseMode] = useState<boolean>(false);
  const [curseEvent, setCurseEvent] = useState<SurgeEvent | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Sync state with backend active events
  const syncWithBackend = useCallback(async () => {
    try {
      setLoading(true);
      const events = await api.events.list();
      const activeEv = events.find((e) => e.active);
      if (activeEv) {
        setCurseEvent(activeEv);
        setIsCurseMode(true);
      } else {
        setIsCurseMode(false);
      }
    } catch (err) {
      console.warn('Could not sync with backend events initially; using local state.', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  const toggleCurseMode = useCallback(async () => {
    const nextState = !isCurseMode;
    setIsCurseMode(nextState);

    try {
      if (curseEvent) {
        // Toggle the existing curse event on backend
        await api.events.toggle(curseEvent.id);
      } else {
        // Create active Midnight Curse event if none existed
        const newEvent = await api.events.create({
          name: 'Midnight Curse',
          multiplier: 3.0,
          ingredient_ids: [1, 4, 5], // Bat Wings, Ghost Pepper, Mandrake Root
          active: nextState,
        });
        setCurseEvent(newEvent);
      }
    } catch (err) {
      console.warn('Backend event sync failed during toggle:', err);
      // Keep UI optimistic toggle state active
    }
  }, [isCurseMode, curseEvent]);

  return (
    <CurseContext.Provider
      value={{
        isCurseMode,
        toggleCurseMode,
        curseEvent,
        loading,
        error,
        curseMultiplier: isCurseMode ? (curseEvent?.multiplier || 3.0) : 1.0,
      }}
    >
      {children}
    </CurseContext.Provider>
  );
};

export function useCurse(): CurseContextType {
  const context = useContext(CurseContext);
  if (!context) {
    throw new Error('useCurse must be used within a CurseProvider');
  }
  return context;
}

export default CurseContext;
