'use client';

import {
  copyToClipboard,
  generateShareableUrl
} from '@/app/lib/frontend/monetizedContentUtils';
import {
  SharedLink
} from '@/app/lib/frontend/sharedLinkFunctions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import FooterPattern from '../components/global/FooterPattern';
import Loader from '../components/global/Loader';
import MonetizedContentCard from '../components/shared/MonetizedContentCard';
import PaginationControls from '../components/shared/PaginationControls';
import { DashboardCard } from '../components/ui/DashboardCard';

export default function SharedLinksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [links, setLinks] = useState<SharedLink[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'public' | 'monetized'>('all');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const loadLinks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/shared-links?filter=${filter}`);
      if (!response.ok) {
        throw new Error('Failed to load shared links');
      }
      const data = await response.json();
      setLinks(data.links);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared links');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (session?.user?.id) {
      loadLinks();
    }
  }, [status, session, router, loadLinks]);

  const handleCopyLink = async (linkId: string) => {
    try {
      await copyToClipboard(generateShareableUrl(linkId));
      setCopySuccess(linkId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      alert('Failed to copy link to clipboard');
    }
  };

  const handleView = (linkId: string) => {
    router.push(`/shared/${linkId}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-6xl heading-text-2 font-anton mb-8">SHARED LINKS</h1>
            <div className='flex justify-center items-center mt-10'><Loader /></div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
        <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl heading-text-2 font-anton mb-4">SHARED LINKS</h1>
          <p className="text-xl font-freeman">
            Manage your public and monetized shared links
          </p>
        </div>

        <DashboardCard />
        
        {/* Filters */}
        <div className="bg-white border-2 border-black brutal-shadow-left p-6 mb-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-lg font-freeman">Filter by type:</span>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'all', label: 'All Links', count: pagination.totalItems },
                { key: 'public', label: 'Public', count: '?' },
                { key: 'monetized', label: 'Monetized', count: '?' }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-4 py-2 border-2 border-black font-freeman transition-all ${
                    filter === key
                      ? 'bg-primary button-primary-pressed'
                      : 'bg-white button-primary duration-100'
                  }`}
                >
                  {label} {count !== '?' && `(${count})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Links List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg font-freeman">No shared links found</p>
            </div>
          ) : (
            <>
              {links.map((link) => (
                <MonetizedContentCard
                  key={link._id}
                  content={{
                    _id: link._id,
                    title: link.title,
                    description: link.description,
                    type: link?.type,
                    price: link.price,
                    item: link.item,
                    accessCount: link.accessCount,
                    paidUsers: link.paidUsers,
                    createdAt: link.createdAt,
                    expiresAt: link.expiresAt
                  }}
                  onCopy={() => handleCopyLink(link.linkId)}
                  onView={() => handleView(link.linkId)}
                  showStats={true}
                  className={copySuccess === link.linkId ? 'border-green-500' : ''}
                />
              ))}
              
              {/* Pagination */}
              <PaginationControls 
                currentPage={pagination.current}
                totalPages={pagination.total}
                onPageChange={loadLinks}
              />
            </>
          )}
        </div>
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 