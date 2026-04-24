import { useState, useEffect, useCallback } from 'react';
import { type Vehicle } from '../types';

const STORAGE_KEY = 'taxi_wash_v2';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function migrateVehicle(v: unknown): Vehicle {
  const raw = v as Record<string, unknown>;
  return {
    id: raw.id as string,
    plateNumber: raw.plateNumber as string,
    customerName: (raw.customerName as string | undefined) ?? '',
    returnTime: (raw.returnTime as string | null | undefined) ?? null,
    washDates: (raw.washDates as string[] | undefined) ?? [],
    createdAt: (raw.createdAt as string | undefined) ?? new Date().toISOString(),
  };
}

function load(): Vehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown[];
    return parsed.map(migrateVehicle);
  } catch {
    return [];
  }
}

export function useStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = useCallback(
    (plateNumber: string, customerName: string, returnTime: string | null) => {
      const v: Vehicle = {
        id: generateId(),
        plateNumber: plateNumber.trim(),
        customerName: customerName.trim(),
        returnTime: returnTime || null,
        washDates: [],
        createdAt: new Date().toISOString(),
      };
      setVehicles((prev) => [...prev, v]);
      return v;
    },
    []
  );

  const updateVehicle = useCallback(
    (id: string, patch: Partial<Pick<Vehicle, 'plateNumber' | 'customerName' | 'returnTime'>>) => {
      setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
    },
    []
  );

  const deleteVehicle = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const toggleWashDate = useCallback((vehicleId: string, date: string) => {
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        const has = v.washDates.includes(date);
        return {
          ...v,
          washDates: has ? v.washDates.filter((d) => d !== date) : [...v.washDates, date].sort(),
        };
      })
    );
  }, []);

  const getCountsByDate = useCallback((): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const v of vehicles) {
      for (const d of v.washDates) {
        counts[d] = (counts[d] ?? 0) + 1;
      }
    }
    return counts;
  }, [vehicles]);

  const getVehiclesForDate = useCallback(
    (date: string): Vehicle[] => vehicles.filter((v) => v.washDates.includes(date)),
    [vehicles]
  );

  const exportBackup = useCallback(() => {
    const data = JSON.stringify({ version: 2, vehicles }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wash-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [vehicles]);

  const importBackup = useCallback((json: string): boolean => {
    try {
      const data = JSON.parse(json) as { version?: number; vehicles?: unknown[] };
      if (!Array.isArray(data.vehicles)) return false;
      setVehicles(data.vehicles.map(migrateVehicle));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    vehicles,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    toggleWashDate,
    getCountsByDate,
    getVehiclesForDate,
    exportBackup,
    importBackup,
  };
}
