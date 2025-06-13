

import { FileExplorer } from '../components/FileExplorer/FileExplorer';
import { DashboardCard } from '../components/ui/DashboardCard';

export default async function Dashboard() {

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <DashboardCard/>
      <FileExplorer />
      
    </div>
  );
} 