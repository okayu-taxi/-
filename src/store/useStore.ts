import { useState, useEffect, useCallback } from 'react';
import { type Vehicle } from '../types';

const STORAGE_KEY = 'taxi_wash_v2';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function load(): Vehicle[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Vehicle[]) : [];
  } catch {
    return [];
  }
}

export function useStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(load);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }, [vehicles]);

  const addVehicle = useCallback((plateNumber: string) => {
    const v: Vehicle = {
      id: generateId(),
      plateNumber: plateNumber.trim(),
      washDates: [],
      createdAt: new Date().toISOString(),
    };
    setVehicles((prev) => [...prev, v]);
    return v;
  }, []);

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
          washDates: has
            ? v.washDates.filter((d) => d !== date)
            : [...v.washDates, date].sort(),
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

  return { vehicles, addVehicle, deleteVehicle, toggleWashDate, getCountsByDate, getVehiclesForDate };
}
