'use client';

import {
    accessSharedLink,
    addSharedItemToDrive,
    formatDate,
    formatFileSize,
    formatPrice,
    payForSharedLink,
    SharedLinkAccessResponse
} from '@/app/lib/frontend/sharedLinkFunctions';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SharedLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const linkId = params.linkId as string;

  const [linkData, setLinkData] = useState<SharedLinkAccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (linkId) {
      loadLinkData();
    }
  }, [linkId, session]);

  const loadLinkData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await accessSharedLink(linkId);
      setLinkData(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToDrive = async () => {
    if (!linkData) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await addSharedItemToDrive(linkId);
      setSuccess(result.message);
      
      // Redirect to dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!linkData) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await payForSharedLink(linkId);
      setSuccess(result.message);
      
      // Reload link data to update access status
      await loadLinkData();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = () => {
    router.push('/auth/signin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to Access Content
          </h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No content found</p>
        </div>
      </div>
    );
  }

  const { link, canAccess, requiresPayment, requiresAuth, alreadyPaid } = linkData;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">
                {link.item?.type === 'folder' ? '📁' : '📄'}
              </span>
              <div>
                <h1 className="text-2xl font-bold">{link.title}</h1>
                <p className="text-blue-100">
                  {link.item?.name} • {link.item?.type}
                  {link.item?.size && ` • ${formatFileSize(link.item.size)}`}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Description */}
            {link.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{link.description}</p>
              </div>
            )}

            {/* Link Type Badge */}
            <div className="mb-6">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                link.type === 'public' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {link.type === 'public' ? '🌐 Public' : '💰 Monetized'}
                {link.type === 'monetized' && link.price && ` - ${formatPrice(link.price)}`}
              </span>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium">{success}</p>
                {success.includes('added to your drive') && (
                  <p className="text-green-600 text-sm mt-1">
                    Redirecting to dashboard...
                  </p>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            )}

            {/* Access Controls */}
            <div className="space-y-4">
              {/* Public Link - Can Access */}
              {canAccess && link.type === 'public' && (
                <div>
                  <p className="text-gray-600 mb-4">
                    This content is freely available. Click below to add it to your drive.
                  </p>
                  {status === 'loading' ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  ) : !session ? (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Please sign in to add this content to your drive.</p>
                      <button
                        onClick={handleLogin}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToDrive}
                      disabled={isProcessing}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Adding to Drive...' : 'Add to My Drive'}
                    </button>
                  )}
                </div>
              )}

              {/* Monetized Link - Already Paid */}
              {canAccess && link.type === 'monetized' && alreadyPaid && (
                <div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <p className="text-blue-800 font-medium">
                      ✅ You have already purchased this content
                    </p>
                  </div>
                  <button
                    onClick={handleAddToDrive}
                    disabled={isProcessing}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Adding to Drive...' : 'Add to My Drive'}
                  </button>
                </div>
              )}

              {/* Monetized Link - Requires Auth */}
              {requiresPayment && requiresAuth && (
                <div className="text-center">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-yellow-800 font-medium">
                      🔒 This content requires payment to access
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Price: {formatPrice(link.price)}
                    </p>
                  </div>
                  <p className="text-gray-600 mb-4">Please sign in to purchase this content.</p>
                  <button
                    onClick={handleLogin}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Sign In to Purchase
                  </button>
                </div>
              )}

              {/* Monetized Link - Can Pay */}
              {requiresPayment && !requiresAuth && session && (
                <div>
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                    <p className="text-yellow-800 font-medium">
                      💳 Payment Required
                    </p>
                    <p className="text-yellow-700 text-sm mt-1">
                      Price: {formatPrice(link.price)}
                    </p>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Purchase this content to add it to your drive and access it anytime.
                  </p>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing Payment...' : `Pay ${formatPrice(link.price)}`}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Secure payment powered by x402 protocol
                  </p>
                </div>
              )}
            </div>

            {/* Link Info */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                {link.owner && (
                  <div>
                    <span className="font-medium">Shared by:</span>
                    <p>{link.owner.name}</p>
                  </div>
                )}
                {link.createdAt && (
                  <div>
                    <span className="font-medium">Created:</span>
                    <p>{formatDate(link.createdAt)}</p>
                  </div>
                )}
                {link.accessCount !== undefined && (
                  <div>
                    <span className="font-medium">Views:</span>
                    <p>{link.accessCount}</p>
                  </div>
                )}
                {link.expiresAt && (
                  <div>
                    <span className="font-medium">Expires:</span>
                    <p>{formatDate(link.expiresAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 