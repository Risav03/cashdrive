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
import Loader from '@/app/components/global/Loader';
import FooterPattern from '@/app/components/global/FooterPattern';
import Link from 'next/link';

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
    if (!linkData || !session) return;

    try {
      setIsProcessing(true);
      setError(null);
      
      const result = await payForSharedLink(linkId, session.user.wallet as `0x${string}`);
      console.log("Shared link payment result:", result);
      
      // Create detailed success message with blockchain info
      let successMessage = `🎉 Payment Successful!\n\n`;
      successMessage += `📄 Content: ${result.sharedLink.title}\n`;
      successMessage += `💰 Amount: ${formatPrice(result.transaction.amount)}\n`;
      successMessage += `📋 Receipt: ${result.transaction.receiptNumber}\n\n`;
      
      if (result.paymentDetails) {
        successMessage += `🔗 Blockchain Details:\n`;
        successMessage += `• Network: ${result.paymentDetails.network}\n`;
        successMessage += `• Transaction: ${result.paymentDetails.transaction.slice(0, 20)}...\n`;
        successMessage += `• Status: ${result.paymentDetails.success ? 'Confirmed' : 'Pending'}\n\n`;
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
                className="bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
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
              className="bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all inline-block"
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

  const { link, canAccess, requiresPayment, requiresAuth, alreadyPaid } = linkData;

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-3xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-amber-100 border-2 border-black brutal-shadow-left">
          {/* Header */}
          <div className="bg-[#FFD000] border-b-2 border-black p-6">
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {link.item?.type === 'folder' ? '📁' : '📄'}
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
              <span className="px-3 py-1 bg-[#FFD000] border-2 border-black brutal-shadow-center font-freeman inline-block">
                {link.type === 'public' ? '🌐 Public' : '💰 Monetized'}
                {link.type === 'monetized' && link.price && ` - ${formatPrice(link.price)}`}
              </span>
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
              {/* Public Link - Can Access */}
              {canAccess && link.type === 'public' && (
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
                        className="bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                      >
                        Sign In
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleAddToDrive}
                      disabled={isProcessing}
                      className="w-full bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Adding to Drive...' : 'Add to My Drive'}
                    </button>
                  )}
                </div>
              )}

              {/* Monetized Link - Already Paid */}
              {canAccess && link.type === 'monetized' && alreadyPaid && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6">
                  <div className="font-freeman mb-4">
                    ✅ You have already purchased this content
                  </div>
                  <button
                    onClick={handleAddToDrive}
                    disabled={isProcessing}
                    className="w-full bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Adding to Drive...' : 'Add to My Drive'}
                  </button>
                </div>
              )}

              {/* Monetized Link - Requires Auth */}
              {requiresPayment && requiresAuth && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-6 text-center">
                  <p className="font-freeman mb-4">
                    🔒 This content requires payment to access
                  </p>
                  <p className="font-freeman mb-6">
                    Price: {formatPrice(link.price)}
                  </p>
                  <button
                    onClick={handleLogin}
                    className="bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                  >
                    Sign In to Purchase
                  </button>
                </div>
              )}

              {/* Monetized Link - Can Pay */}
              {requiresPayment && !requiresAuth && session && (
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
                    className="w-full bg-[#FFD000] border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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