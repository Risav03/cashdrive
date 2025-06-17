'use client';

import { BreadcrumbItem } from '@/app/lib/types';
import Link from 'next/link';

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  onNavigate: (id: string) => void;
}

export const BreadcrumbNav = ({ items, onNavigate }: BreadcrumbNavProps) => {
  return (
    <nav className="flex items-center font-freeman">
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center">
          {index > 0 && <span className="mx-2 text-black">/</span>}
          <button
            onClick={() => onNavigate(item.id)}
            className="hover:text-primary transition-colors"
          >
            {index === 0 ? 'My Drive' : item.name}
          </button>
        </div>
      ))}
    </nav>
  );
}; 