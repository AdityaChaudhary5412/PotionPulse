import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { SurgeEvent } from '../types';

export interface CurseConfig {
  name: string;
  multiplier: number;
  ingredient_ids: number[];
  start_date?: string | null;
  end_date?: string | null;
}

interface CurseContextType {
  isCurseMode: boolean;
  curseEvent: SurgeEvent | null;
  curseMultiplier: number;
  isCurseModalOpen: boolean;
  setCurseModalOpen: (open: boolean) => void;
  activateCurse: (config: CurseConfig) => Promise<void>;
  deactivateCurse: () => Promise<void>;
  toggleCurseMode: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const CurseContext = createContext<CurseContextType | undefined>(undefined);

export const CurseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCurseMode, setIsCurseMode] = useState<boolean>(false);
  const [curseEvent, setCurseEvent] = useState<SurgeEvent | null>(null);
  const [isCurseModalOpen, setCurseModalOpen] = useState<boolean>(false);
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
        setCurseEvent(null);
        setIsCurseMode(false);
      }
    } catch (err: any) {
      console.warn('Could not sync with backend events initially:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
  }, [syncWithBackend]);

  // Activate Curse with custom config
  const activateCurse = useCallback(async (config: CurseConfig) => {
    try {
      setLoading(true);
      // Create new active surge event
      const newEv = await api.events.create({
        name: config.name.trim() || 'Midnight Curse',
        multiplier: Number(config.multiplier) || 3.0,
        ingredient_ids: config.ingredient_ids.length > 0 ? config.ingredient_ids : [1, 4, 5],
        start_date: config.start_date || new Date().toISOString(),
        end_date: config.end_date || new Date(Date.now() + 7 * 86400000).toISOString()
      });

      setCurseEvent(newEv);
      setIsCurseMode(true);
      setCurseModalOpen(false);
      await syncWithBackend();
    } catch (err: any) {
      console.error('Failed to activate curse:', err);
      setError('Could not summon curse on the server.');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [syncWithBackend]);

  // Deactivate Curse (Turn off with 1 click)
  const deactivateCurse = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all active events and toggle them off
      const events = await api.events.list();
      for (const ev of events) {
        if (ev.active) {
          await api.events.toggle(ev.id);
        }
      }
      setIsCurseMode(false);
      setCurseEvent(null);
      await syncWithBackend();
    } catch (err: any) {
      console.error('Failed to deactivate curse:', err);
      setIsCurseMode(false);
    } finally {
      setLoading(false);
    }
  }, [syncWithBackend]);

  // Toggle switch: if currently active -> turn off immediately. If off -> open config modal
  const toggleCurseMode = useCallback(async () => {
    if (isCurseMode) {
      await deactivateCurse();
    } else {
      setCurseModalOpen(true);
    }
  }, [isCurseMode, deactivateCurse]);

  return (
    <CurseContext.Provider
      value={{
        isCurseMode,
        curseEvent,
        curseMultiplier: isCurseMode ? (curseEvent?.multiplier || 3.0) : 1.0,
        isCurseModalOpen,
        setCurseModalOpen,
        activateCurse,
        deactivateCurse,
        toggleCurseMode,
        syncWithBackend,
        loading,
        error
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
