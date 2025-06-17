'use client';

import {
    copyLinkToClipboard,
    formatDate,
    formatFileSize,
    formatPrice,
    generateShareableUrl,
    getLinkTypeColor,
    getSharedLinks,
    SharedLink,
    SharedLinkResponse
} from '@/app/lib/frontend/sharedLinkFunctions';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '../components/global/Loader';
import FooterPattern from '../components/global/FooterPattern';
import { DashboardCard } from '../components/ui/DashboardCard';
import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { FaFolder } from 'react-icons/fa';
import React from 'react';

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
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'monetized'>('all');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
    
    if (status === 'authenticated') {
      loadLinks();
    }
  }, [status, filter]);

  const loadLinks = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = { page, limit: 10 };
      
      if (filter !== 'all') {
        params.type = filter;
      }
      
      const response: SharedLinkResponse = await getSharedLinks(params);
      setLinks(response.links);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to load shared links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (linkId: string) => {
    try {
      await copyLinkToClipboard(linkId);
      setCopySuccess(linkId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      alert('Failed to copy link to clipboard');
    }
  };

  const handlePageChange = (page: number) => {
    loadLinks(page);
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
        <div className="bg-white border-2 border-black brutal-shadow-left overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className='flex justify-center items-center mt-10'><Loader /></div>
            </div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center">
              <h3 className="text-2xl heading-text-2 font-anton mb-4">NO SHARED LINKS YET</h3>
              <p className="text-lg font-freeman mb-6">
                Create your first shared link from the file manager
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                Go to File Manager
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-amber-100 px-6 py-4 border-b-2 border-black">
                <div className="grid grid-cols-12 gap-4 text-base font-freeman">
                  <div className="col-span-4">Content</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Views</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y-2 divide-black">
                {links.map((link) => (
                  <div key={link._id} className="px-6 py-4 hover:bg-amber-100 transition-colors">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Content */}
                      <div className="col-span-4">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">
                            {link.item.type === 'folder' ? (
                              <FaFolder />
                            ) : (
                              React.createElement(getFileIcon(link.item.mimeType), {
                                className: "w-8 h-8"
                              })
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-lg font-freeman truncate">
                              {link.title}
                            </p>
                            <p className="text-base truncate">
                              {link.item.name}
                              {link.item.size && ` • ${formatFileSize(link.item.size)}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <span className="px-3 py-1 bg-primary border-2 border-black font-freeman inline-block">
                          {link.type === 'public' ? '🌐 Public' : '💰 Monetized'}
                        </span>
                        {link.type === 'monetized' && link.price && (
                          <p className="mt-2 font-freeman">
                            {formatPrice(link.price)}
                          </p>
                        )}
                      </div>

                      {/* Views */}
                      <div className="col-span-2 font-freeman">
                        <p className="text-lg">{link.accessCount} views</p>
                        {link.type === 'monetized' && (
                          <p className="text-base">
                            {link.paidUsers.length} paid
                          </p>
                        )}
                      </div>

                      {/* Created */}
                      <div className="col-span-2 font-freeman">
                        <p className="text-base">
                          {formatDate(link.createdAt)}
                        </p>
                        {link.expiresAt && (
                          <p className="text-base">
                            Expires: {formatDate(link.expiresAt)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(link.linkId)}
                            className={`px-3 py-1 border-2 border-black font-freeman transition-all ${
                              copySuccess === link.linkId
                                ? 'bg-primary button-primary-pressed text-sm font-freeman'
                                : 'bg-white button-primary duration-100'
                            }`}
                          >
                            {copySuccess === link.linkId ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            onClick={() => window.open(generateShareableUrl(link.linkId), '_blank')}
                            className="px-3 py-1 bg-white border-2 border-black button-primary duration-100 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="text-lg font-freeman">
              Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={pagination.current === 1}
                className="bg-white border-2 border-black brutal-shadow-left px-4 py-2 font-freeman disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                Previous
              </button>
              {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-4 py-2 border-2 border-black font-freeman ${
                    page === pagination.current
                      ? 'bg-primary brutal-shadow-center translate-x-1 translate-y-1'
                      : 'bg-white brutal-shadow-left hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center'
                  } transition-all`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={pagination.current === pagination.total}
                className="bg-white border-2 border-black brutal-shadow-left px-4 py-2 font-freeman disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
      <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
    </div>
  );
} 