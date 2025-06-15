'use client';

import { FileExplorer } from '../components/FileExplorer/FileExplorer';
import { DashboardCard } from '../components/ui/DashboardCard';
import FooterPattern from '../components/global/FooterPattern';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center p-8 rounded-lg">
          <h2 className="heading-text-2 text-6xl font-anton mb-8">
            DASHBOARD
          </h2>
        </div>
        <DashboardCard />
        <FileExplorer />
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 