import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import CourtTable from '../../components/CourtTable';

const AdminSchedule = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">Club Schedule</h1>

        <div className="card">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input max-w-xs"/>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"/>Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"/>Booked</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300"/>Past</span>
            </div>
          </div>
        </div>

        <CourtTable date={date} readOnly={true} />
      </div>
    </DashboardLayout>
  );
};

export default AdminSchedule;
