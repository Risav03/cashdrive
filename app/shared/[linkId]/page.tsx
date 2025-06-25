'use client';

import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';
import { getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import {
  addSharedItemToDrive,
  formatDate,
  formatFileSize,
  formatPrice,
  payForSharedLink,
  SharedLinkAccessResponse
} from '@/app/lib/frontend/sharedLinkFunctions';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { FaFolder } from 'react-icons/fa';

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
  const [addedToDrive, setAddedToDrive] = useState(false);

  const loadLinkData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`/api/shared-links/${linkId}/details`);
      if (!response.ok) {
        throw new Error('Failed to load shared link');
      }
      const data = await response.json();
      setLinkData(data.sharedLink);
    } catch (err: any) {
      setError(err.message || 'Failed to load shared link');
    } finally {
      setIsLoading(false);
    }
  }, [linkId]);

  useEffect(() => {
    if (linkId) {
      loadLinkData();
    }
  }, [linkId, loadLinkData]);

  const handleAddToDrive = async () => {
    if (!linkData) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await addSharedItemToDrive(linkId);
      setSuccess(result.message);
      setAddedToDrive(true);
      
      // Don't redirect, just show success message
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (!linkData || !session) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await payForSharedLink(linkId, session.user.wallet as `0x${string}`);
      console.log("Shared link payment result:", result);
      
      // Create detailed success message with blockchain info
      let successMessage = `🎉 Payment Successful!\n\n`;
      successMessage += `�� Content: ${result.transactionData.sharedLink.title}\n`;
      successMessage += `💰 Amount: ${formatPrice(result.transactionData.transaction.amount)}\n`;
      successMessage += `📋 Receipt: ${result.transactionData.transaction.receiptNumber}\n\n`;
      
      if (result.transactionData.paymentDetails) {
        successMessage += `🔗 Blockchain Details:\n`;
        successMessage += `• Network: ${result.transactionData.paymentDetails.network}\n`;
        successMessage += `• Transaction: ${result.transactionData.paymentDetails.transaction.slice(0, 20)}...\n`;
        successMessage += `• Status: ${result.transactionData.paymentDetails.success ? 'Confirmed' : 'Pending'}\n\n`;
        successMessage += `View full details in your transaction history.`;
      }
      
      setSuccess(successMessage);
      
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
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              LOADING SHARED CONTENT
            </h2>
            <div className='flex justify-center items-center mt-10'><Loader /></div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              ACCESS ERROR
            </h2>
            <div className="bg-white border-2 border-black brutal-shadow-left p-8">
              <h3 className="text-2xl font-anton mb-4">Unable to Access Content</h3>
              <p className="font-freeman mb-6">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                Go Home
              </button>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              NO CONTENT FOUND
            </h2>
            <Link
              href="/"
              className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all inline-block"
            >
              Return Home
            </Link>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  const { link, canAccess, requiresPayment, requiresAuth, alreadyPaid, isOwner } = linkData;

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-3xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* <div className="mb-6">
          <Link
            href="/shared-links"
            className="button-primary bg-white px-4 py-1.5 inline-flex items-center font-freeman text-sm border-2 border-black brutal-shadow-left hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
          >
            ← Back to Shared Links
          </Link>
        </div> */}

        <div className="bg-amber-100 border-2 border-black brutal-shadow-left">
          {/* Header */}
          <div className="bg-primary border-b-2 border-black p-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {link.item?.type === 'folder' ? (
                  <FaFolder className="w-10 h-10" />
                ) : (
                  React.createElement(getFileIcon(link.item?.mimeType), {
                    className: "w-10 h-10"
                  })
                )}
              </span>
              <div>
                <h1 className="text-2xl font-anton mb-1">{link.title}</h1>
                <p className="font-freeman">
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
                <h3 className="text-lg font-anton mb-2">Description</h3>
                <p className="font-freeman">{link.description}</p>
              </div>
            )}

            {/* Link Type Badge */}
            <div className="mb-6">
              <span className="px-3 py-1 bg-primary border-2 border-black brutal-shadow-center font-freeman inline-block">
                {link?.type === 'public' ? '🌐 Public' : '💰 Monetized'}
                {link?.type === 'monetized' && link.price && ` - ${formatPrice(link.price)}`}
              </span>
              {isOwner && (
                <span className="ml-2 px-3 py-1 bg-amber-200 border-2 border-black brutal-shadow-center font-freeman inline-block">
                  👤 You are the owner
                </span>
              )}
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-6 p-4 bg-white border-2 border-black brutal-shadow-left">
                <pre className="font-freeman whitespace-pre-wrap">{success}</pre>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 bg-white border-2 border-black brutal-shadow-left">
                <p className="font-freeman text-red-600">{error}</p>
              </div>
            )}

            {/* Access Controls */}
            <div className="space-y-4">
              {/* Owner View */}
              {isOwner && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6">
                  <p className="font-freeman mb-4">
                    You created this shared link. You can manage it from your shared links dashboard.
                  </p>
                  <Link
                    href="/shared-links"
                    className="block w-full text-center bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                  >
                    Go to Shared Links
                  </Link>
                </div>
              )}

              {/* Public Link - Can Access */}
              {!isOwner && canAccess && link?.type === 'public' && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6">
                  <p className="font-freeman mb-4">
                    This content is freely available. Click below to add it to your drive.
                  </p>
                  {status === 'loading' ? (
                    <div className="text-center py-4">
                      <div className='flex justify-center items-center mt-10'><Loader /></div>
                    </div>
                  ) : !session ? (
                    <div className="text-center">
                      <p className="font-freeman mb-4">Please sign in to add this content to your drive.</p>
                      <button
                        onClick={handleLogin}
                        className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToDrive}
                      disabled={isProcessing || addedToDrive}
                      className="w-full bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Adding to Drive...' : addedToDrive ? 'Added to Drive ✓' : 'Add to My Drive'}
                    </button>
                  )}
                </div>
              )}

              {/* Monetized Link - Already Paid */}
              {!isOwner && canAccess && link?.type === 'monetized' && alreadyPaid && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6">
                  <div className="font-freeman mb-4">
                    ✅ You have already purchased this content
                  </div>
                  <button
                    onClick={handleAddToDrive}
                    disabled={isProcessing || addedToDrive}
                    className="w-full bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Adding to Drive...' : addedToDrive ? 'Added to Drive ✓' : 'Add to My Drive'}
                  </button>
                </div>
              )}

              {/* Monetized Link - Requires Auth */}
              {!isOwner && requiresPayment && requiresAuth && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6 text-center">
                  <p className="font-freeman mb-4">
                    🔒 This content requires payment to access
                  </p>
                  <p className="font-freeman mb-6">
                    Price: {formatPrice(link.price)}
                  </p>
                  <button
                    onClick={handleLogin}
                    className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                  >
                    Sign In to Purchase
                  </button>
                </div>
              )}

              {/* Monetized Link - Can Pay */}
              {!isOwner && requiresPayment && !requiresAuth && session && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6">
                  <p className="font-freeman mb-2">
                    💳 Payment Required
                  </p>
                  <p className="font-freeman mb-4">
                    Price: {formatPrice(link.price)}
                  </p>
                  <p className="font-freeman mb-4">
                    Purchase this content to add it to your drive and access it anytime.
                  </p>
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing Payment...' : `Pay ${formatPrice(link.price)}`}
                  </button>
                  <p className="text-sm font-freeman mt-2 text-center">
                    Secure payment powered by x402 protocol
                  </p>
                </div>
              )}
            </div>

            {/* Link Info */}
            <div className="mt-8 pt-6 border-t-2 border-black">
              <div className="grid grid-cols-2 gap-4 font-freeman">
                {link.owner && (
                  <div>
                    <span className="font-anton">Shared by:</span>
                    <p>{link.owner.name}</p>
                  </div>
                )}
                {link.createdAt && (
                  <div>
                    <span className="font-anton">Created:</span>
                    <p>{formatDate(link.createdAt)}</p>
                  </div>
                )}
                {link.accessCount !== undefined && (
                  <div>
                    <span className="font-anton">Views:</span>
                    <p>{link.accessCount}</p>
                  </div>
                )}
                {link.expiresAt && (
                  <div>
                    <span className="font-anton">Expires:</span>
                    <p>{formatDate(link.expiresAt)}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
    </div>
  );
} 