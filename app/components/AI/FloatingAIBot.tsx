'use client';

import { useEffect, useState } from 'react';
import { FaRobot } from 'react-icons/fa';

interface FloatingAIBotProps {
  onToggle: () => void;
  isOpen: boolean;
}

export default function FloatingAIBot({ onToggle, isOpen }: FloatingAIBotProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Reset hover state when AI opens
  useEffect(() => {
    if (isOpen) {
      setIsHovered(false);
    }
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (!isOpen) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Don't render the bot when AI is open
  if (isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Tooltip - only show when not open and hovered */}
      {isHovered && (
        <div className="absolute bottom-16 right-0 bg-black text-white px-3 py-2 text-sm font-freeman whitespace-nowrap border-2 border-black brutal-shadow-left">
          Unleash AI-powered content creation
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
        </div>
      )}
      
      {/* Bot Icon */}
      <button
        onClick={onToggle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="w-14 h-14 rounded-full border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all duration-200 flex items-center justify-center bg-[#FFD000] hover:bg-yellow-300"
      >
        <FaRobot className="text-xl text-black" />
      </button>
    </div>
  );
} 