'use client';

import { useState } from 'react';
import AIOverlay from '../components/AI/AIOverlay';
import FloatingAIBot from '../components/AI/FloatingAIBot';
import { FileExplorer } from '../components/FileExplorer/FileExplorer';
import FooterPattern from '../components/global/FooterPattern';
import { DashboardCard } from '../components/ui/DashboardCard';

export default function Dashboard() {
  const [isAIOpen, setIsAIOpen] = useState(false);

  const toggleAI = () => {
    setIsAIOpen(!isAIOpen);
  };

  const closeAI = () => {
    setIsAIOpen(false);
  };

  return (
    <div className="min-h-screen bg-white relative">
      
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center p-8 rounded-lg">
          <h2 className="heading-text-2 text-6xl font-anton mb-8">
            DASHBOARD
          </h2>
        </div>
        
        {/* Show dashboard card only when AI is closed */}
        {!isAIOpen && <DashboardCard />}
        
        {/* File Explorer - moves up when AI is open */}
        <div className={`transition-all duration-300 ${isAIOpen ? 'mt-0' : ''}`}>
          <FileExplorer />
        </div>
      </main>
      
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      
      {/* Floating AI Bot */}
      <FloatingAIBot onToggle={toggleAI} isOpen={isAIOpen} />
      
      {/* AI Overlay */}
      <AIOverlay isOpen={isAIOpen} onClose={closeAI} />
    </div>
  );
} 