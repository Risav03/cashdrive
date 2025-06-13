

import { FileExplorer } from '../components/FileExplorer/FileExplorer';
import { DashboardCard } from '../components/ui/DashboardCard';

export default async function Dashboard() {

  return (
    <div className=" min-h-screen flex flex-col  py-12 px-4 sm:px-6 lg:px-8">
      <DashboardCard/>
      <div className='w-full h-2 rounded-full my-2 '></div>
      <FileExplorer />
      
    </div>
  );
} 