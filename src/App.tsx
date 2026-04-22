import { useState } from 'react';
import { useStore } from './store/useStore';
import { Dashboard } from './components/Dashboard';
import { VehicleList } from './components/VehicleList';
import { WashRecords } from './components/WashRecords';
import './index.css';

type Tab = 'dashboard' | 'vehicles' | 'records';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'ダッシュボード', icon: '🏠' },
  { id: 'vehicles', label: '車両管理', icon: '🚕' },
  { id: 'records', label: '洗車記録', icon: '📋' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { vehicles, records, addVehicle, deleteVehicle, addWashRecord, updateRecordStatus, deleteRecord } = useStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🚿</span>
          <div>
            <h1 className="text-xl font-bold leading-tight">タクシー洗車管理</h1>
            <p className="text-blue-200 text-xs">Taxi Wash Management</p>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            vehicles={vehicles}
            records={records}
            onUpdateStatus={updateRecordStatus}
          />
        )}
        {activeTab === 'vehicles' && (
          <VehicleList
            vehicles={vehicles}
            onAdd={addVehicle}
            onDelete={deleteVehicle}
          />
        )}
        {activeTab === 'records' && (
          <WashRecords
            vehicles={vehicles}
            records={records}
            onAdd={addWashRecord}
            onUpdateStatus={updateRecordStatus}
            onDelete={deleteRecord}
          />
        )}
      </main>
    </div>
  );
}
