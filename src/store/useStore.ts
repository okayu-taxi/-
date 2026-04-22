import { useState, useEffect, useCallback } from 'react';
import { type Vehicle, type WashRecord, type WashType } from '../types';

const VEHICLES_KEY = 'taxi_wash_vehicles';
const RECORDS_KEY = 'taxi_wash_records';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useStore() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    loadFromStorage<Vehicle[]>(VEHICLES_KEY, [])
  );
  const [records, setRecords] = useState<WashRecord[]>(() =>
    loadFromStorage<WashRecord[]>(RECORDS_KEY, [])
  );

  useEffect(() => {
    saveToStorage(VEHICLES_KEY, vehicles);
  }, [vehicles]);

  useEffect(() => {
    saveToStorage(RECORDS_KEY, records);
  }, [records]);

  const addVehicle = useCallback(
    (data: Omit<Vehicle, 'id' | 'lastWashedAt' | 'createdAt'>) => {
      const vehicle: Vehicle = {
        ...data,
        id: generateId(),
        lastWashedAt: null,
        createdAt: new Date().toISOString(),
      };
      setVehicles((prev) => [...prev, vehicle]);
      return vehicle;
    },
    []
  );

  const updateVehicle = useCallback(
    (id: string, data: Partial<Omit<Vehicle, 'id' | 'createdAt'>>) => {
      setVehicles((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ...data } : v))
      );
    },
    []
  );

  const deleteVehicle = useCallback((id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    setRecords((prev) => prev.filter((r) => r.vehicleId !== id));
  }, []);

  const addWashRecord = useCallback(
    (data: { vehicleId: string; washType: WashType; scheduledAt: string; notes: string; cost: number }) => {
      const record: WashRecord = {
        ...data,
        id: generateId(),
        status: 'pending',
        completedAt: null,
        createdAt: new Date().toISOString(),
      };
      setRecords((prev) => [...prev, record]);
      return record;
    },
    []
  );

  const updateRecordStatus = useCallback(
    (id: string, status: WashRecord['status']) => {
      const now = new Date().toISOString();
      setRecords((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, status, completedAt: status === 'completed' ? now : r.completedAt };
          return updated;
        })
      );
      if (status === 'completed') {
        const record = records.find((r) => r.id === id);
        if (record) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === record.vehicleId ? { ...v, lastWashedAt: now } : v
            )
          );
        }
      }
    },
    [records]
  );

  const deleteRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    vehicles,
    records,
    addVehicle,
    updateVehicle,
    deleteVehicle,
    addWashRecord,
    updateRecordStatus,
    deleteRecord,
  };
}
