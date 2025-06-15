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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Shared Links</h1>
          <p className="text-gray-600">
            Manage your public and monetized shared links
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter by type:</span>
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All Links', count: pagination.totalItems },
                { key: 'public', label: 'Public', count: '?' },
                { key: 'monetized', label: 'Monetized', count: '?' }
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as any)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    filter === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} {count !== '?' && `(${count})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Links List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading your shared links...</p>
            </div>
          ) : links.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-5xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared links yet</h3>
              <p className="text-gray-600 mb-4">
                Create your first shared link from the file manager
              </p>
              <button
                onClick={() => router.push('/file-manager')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Go to File Manager
              </button>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">Content</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-2">Views</div>
                  <div className="col-span-2">Created</div>
                  <div className="col-span-2">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {links.map((link) => (
                  <div key={link._id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Content */}
                      <div className="col-span-4">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">
                            {link.item.type === 'folder' ? '📁' : '📄'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {link.title}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {link.item.name}
                              {link.item.size && ` • ${formatFileSize(link.item.size)}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Type */}
                      <div className="col-span-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLinkTypeColor(link.type)}`}>
                          {link.type === 'public' ? '🌐 Public' : '💰 Monetized'}
                        </span>
                        {link.type === 'monetized' && link.price && (
                          <p className="text-xs text-gray-500 mt-1">
                            {formatPrice(link.price)}
                          </p>
                        )}
                      </div>

                      {/* Views */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">{link.accessCount}</p>
                        {link.type === 'monetized' && (
                          <p className="text-xs text-gray-500">
                            {link.paidUsers.length} paid
                          </p>
                        )}
                      </div>

                      {/* Created */}
                      <div className="col-span-2">
                        <p className="text-sm text-gray-900">
                          {formatDate(link.createdAt)}
                        </p>
                        {link.expiresAt && (
                          <p className="text-xs text-gray-500">
                            Expires: {formatDate(link.expiresAt)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyLink(link.linkId)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                              copySuccess === link.linkId
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {copySuccess === link.linkId ? 'Copied!' : 'Copy Link'}
                          </button>
                          <button
                            onClick={() => window.open(generateShareableUrl(link.linkId), '_blank')}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
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
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current - 1) * 10) + 1} to {Math.min(pagination.current * 10, pagination.totalItems)} of {pagination.totalItems} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.current - 1)}
                disabled={pagination.current === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 text-sm border rounded ${
                    page === pagination.current
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(pagination.current + 1)}
                disabled={pagination.current === pagination.total}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 