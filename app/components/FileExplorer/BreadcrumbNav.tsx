'use client';

import { BreadcrumbItem } from '@/app/lib/types';
import Link from 'next/link';

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string) => void;
}

export const BreadcrumbNav = ({ items, onNavigate }: BreadcrumbNavProps) => {
  return (
    <nav className="flex items-center space-x-2 py-2 px-3 bg-gray-100 rounded-lg">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center">
          {index > 0 && <span className="mx-2 text-gray-500">/</span>}
          <button
            onClick={() => onNavigate(item.id)}
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {index === 0 ? 'My Drive' : item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}; 