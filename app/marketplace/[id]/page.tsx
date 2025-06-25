'use client';

import AffiliateSetupModal from '@/app/components/Affiliates/AffiliateSetupModal';
import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';
import { formatFileSize, getFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { deleteListing, getListing } from '@/app/lib/frontend/marketplaceFunctions';
import { formatDate, formatPrice } from '@/app/lib/frontend/monetizedContentUtils';
import { purchaseListing } from '@/app/lib/frontend/transactionFunctions';
import { Listing } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createElement, useCallback, useEffect, useState } from 'react';
import { FaFolder } from 'react-icons/fa';
import { FiUsers } from 'react-icons/fi';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [affiliateCode, setAffiliateCode] = useState<string | null>(null);
  const [affiliateInfo, setAffiliateInfo] = useState<any>(null);
  const [affiliateValidated, setAffiliateValidated] = useState(false);

  const listingId = params.id as string;
  const refCode = searchParams.get('ref');
  const isOwner = session?.user?.id === listing?.seller._id;

  const fetchListing = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getListing(listingId, true);
      setListing(data);

      if (session?.user?.id === data.seller._id) {
        const freshData = await getListing(listingId, false);
        setListing(freshData);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  }, [listingId, session]);

  const checkPurchaseStatus = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setCheckingPurchase(true);
      const response = await fetch(`/api/listings/${listingId}/purchase-status`);
      if (response.ok) {
        const data = await response.json();
        setAlreadyPurchased(data.hasPurchased);
      }
    } catch (err) {
      console.error('Error checking purchase status:', err);
    } finally {
      setCheckingPurchase(false);
    }
  }, [session, listingId]);

  const handleRemoveListing = async () => {
    if (!confirm('Are you sure you want to remove this listing? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteListing(listingId);
      router.push('/marketplace');
    } catch (err: any) {
      alert('Failed to remove listing: ' + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!session) {
      alert('Please log in to purchase items');
      return;
    }

    if (!session.user.wallet) {
      alert('No wallet found. Please connect your wallet and try again.');
      return;
    }

    if (!confirm(`Are you sure you want to purchase "${listing?.title}" for ${formatPrice(listing?.price || 0)}?`)) {
      return;
    }

    try {
      setPurchaseLoading(true);
      console.log('Attempting purchase with wallet:', session.user.wallet);
      const result = await purchaseListing(listingId, session.user.wallet as `0x${string}`, affiliateCode || undefined);
      console.log("Purchase result:", result);

      if (!result?.transactionData) {
        throw new Error('Invalid transaction data received');
      }

      const { transaction, copiedItem, paymentDetails } = result.transactionData;

      if (!transaction || !transaction.item) {
        throw new Error('Invalid transaction data structure');
      }

      setPurchaseSuccess(true);

      // Create detailed success message with blockchain info
      let successMessage = `🎉 Purchase Successful!\n\n`;
      successMessage += `📄 Item: ${transaction.item.name}\n`;
      successMessage += `💰 Amount: ${formatPrice(transaction.amount)}\n`;
      successMessage += `📋 Receipt: ${transaction.receiptNumber}\n`;

      if (copiedItem?.path) {
        successMessage += `📁 File Location: ${copiedItem.path}\n\n`;
      }

      if (paymentDetails) {
        successMessage += `🔗 Blockchain Details:\n`;
        successMessage += `• Network: ${paymentDetails.network}\n`;
        successMessage += `• Transaction: ${paymentDetails.transaction.slice(0, 20)}...\n`;
        successMessage += `• Status: ${paymentDetails.success ? 'Confirmed' : 'Pending'}\n\n`;
        successMessage += `View full details in your transaction history.`;
      }

      alert(successMessage);
    } catch (err: any) {
      console.error('Purchase error:', err);
      alert(err.message || 'Purchase failed. Please try again.');
      setPurchaseSuccess(false);
    } finally {
      setPurchaseLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId, fetchListing]);

  useEffect(() => {
    if (listing && session?.user?.id) {
      checkPurchaseStatus();
    }
  }, [listing, session, checkPurchaseStatus]);

  const validateAffiliateCode = async (code: string) => {
    try {
      const response = await fetch(`/api/affiliates/code/${code}`);
      if (response.ok) {
        const data = await response.json();
        setAffiliateInfo(data.affiliate);
        setAffiliateValidated(true);
        return true;
      } else {
        setAffiliateInfo(null);
        setAffiliateValidated(false);
        return false;
      }
    } catch (error) {
      console.error('Error validating affiliate code:', error);
      setAffiliateInfo(null);
      setAffiliateValidated(false);
      return false;
    }
  };

  useEffect(() => {
    if (refCode) {
      setAffiliateCode(refCode);
      validateAffiliateCode(refCode);
    }
  }, [refCode]);

  if (!listing || loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="mb-6">
            <Link
              href="/marketplace"
              className="button-primary bg-white px-4 py-1.5 inline-flex items-center font-freeman text-sm"
            >
              ← Back to Marketplace
            </Link>
          </nav>
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <h2 className="heading-text-2 text-6xl font-anton mb-8">LOADING</h2>
              <div className='flex justify-center items-center mt-10'>
                <Loader />
              </div>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
          <nav className="mb-6">
            <Link
              href="/marketplace"
              className="button-primary bg-white px-4 py-1.5 inline-flex items-center font-freeman text-sm"
            >
              ← Back to Marketplace
            </Link>
          </nav>
          <div className="bg-red-100 border-2 border-black p-8 brutal-shadow-left">
            <h3 className="text-xl font-freeman mb-4">
              Error loading listing
            </h3>
            <p className="font-freeman mb-6">{error}</p>
            <button
              onClick={fetchListing}
              className="button-primary bg-primary px-8 py-2"
            >
              Try again
            </button>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-3xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Navigation */}
        <nav className="mb-6">
          <Link
            href="/marketplace"
            className="button-primary bg-white px-4 py-1.5 inline-flex items-center font-freeman text-sm"
          >
            ← Back to Marketplace
          </Link>
        </nav>

        <div className="bg-amber-100 border-2 border-black brutal-shadow-left">
          {/* Header */}
          <div className="p-6 border-b-2 border-black">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left side content */}
              <div className="flex items-start gap-4">
                <span className="text-5xl shrink-0">
                  {createElement(listing.item?.type === 'folder' ? FaFolder : getFileIcon(listing.item?.mimeType), { className: "w-12 h-12" })}
                </span>
                <div className="min-w-0">
                  <h1 className="text-2xl font-freeman mb-2 break-words">{listing.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-freeman text-gray-700">
                    <span className="break-words">by {listing.seller.name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{listing.views} {listing.views === 1 ? 'view' : 'views'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>Listed {formatDate(listing.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Right side content */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                <span className="px-3 py-1 bg-primary border-2 border-black font-freeman text-sm brutal-shadow-center whitespace-nowrap">
                  {listing.status.toUpperCase()}
                </span>
                <span className="text-2xl font-freeman">
                  {formatPrice(listing.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Affiliate Notification */}
                {affiliateValidated && affiliateInfo && (
                  <div className="bg-green-100 border-2 border-green-400 p-4 brutal-shadow-left">
                    <p className="font-freeman text-sm">
                      <span className="font-bold">You are buying through an affiliate link.</span> The referrer will earn {affiliateInfo.commissionRate}% commission.
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <h2 className="text-lg font-freeman mb-2">Description</h2>
                  <p className="font-freeman text-sm whitespace-pre-wrap">{listing.description}</p>
                </div>

                {/* Tags */}
                {listing.tags && listing.tags.length > 0 && (
                  <div>
                    <h2 className="text-lg font-freeman mb-2">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-primary border-2 border-black font-freeman text-sm brutal-shadow-center"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* File Information */}
                <div className="bg-white border-2 border-black p-4 brutal-shadow-left">
                  <h3 className="text-lg font-freeman mb-3">File Details</h3>
                  <div className="space-y-2 font-freeman text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{listing.item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{listing.item?.type}</span>
                    </div>
                    {listing.item.size && (
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(listing.item.size)}</span>
                      </div>
                    )}
                    {listing.item?.mimeType && (
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span>{listing.item?.mimeType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  {!isOwner && listing.status === 'active' && !purchaseSuccess && !alreadyPurchased && !checkingPurchase && (
                    <button
                      onClick={handlePurchase}
                      disabled={purchaseLoading}
                      className="button-primary bg-primary w-full py-3 px-4 text-sm font-freeman"
                    >
                      {purchaseLoading ? 'Processing Purchase...' : `Purchase for ${formatPrice(listing.price)}`}
                    </button>
                  )}

                  {purchaseSuccess && (
                    <div className="bg-green-100 border-2 border-black p-4 font-freeman text-sm brutal-shadow-left">
                      ✅ Purchase completed! File added to your marketplace folder.
                    </div>
                  )}

                  {alreadyPurchased && (
                    <div className="bg-white border-2 border-black p-4 font-freeman text-sm brutal-shadow-left">
                      You have already purchased this item.
                    </div>
                  )}

                  {checkingPurchase && (
                    <div className="bg-white border-2 border-black p-4 font-freeman text-sm brutal-shadow-left">
                      Checking purchase status...
                    </div>
                  )}

                  {isOwner && (
                    <div className="space-y-2">
                      <Link
                        href={`/marketplace/${listing._id}/edit`}
                        className="button-primary bg-primary w-full py-2 px-4 text-sm text-center mt-5"
                      >
                        Edit Listing
                      </Link>
                      {listing.status === 'active' && (
                        <button
                          onClick={handleRemoveListing}
                          disabled={deleteLoading}
                          className="button-primary bg-red-100 w-full py-2 px-4 text-sm mt-5"
                        >
                          {deleteLoading ? 'Removing...' : 'Remove Listing'}
                        </button>
                      )}
                    </div>
                  )}

                  {listing.status === 'inactive' && (
                    <div className="bg-white border-2 border-black p-4 font-freeman text-sm brutal-shadow-left text-center">
                      This listing is currently inactive
                    </div>
                  )}
                </div>

                {/* Affiliate Section */}
                {listing.affiliateEnabled && !isOwner && (
                  <div className="bg-white border-2 border-black p-4 brutal-shadow-left">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-freeman">Affiliate Program</h3>
                      <span className="text-sm font-freeman text-green-600">
                        {listing.defaultCommissionRate}% commission
                      </span>
                    </div>
                    <p className="text-sm font-freeman mb-3">
                      Earn commission by sharing this listing with others.
                    </p>
                    <button
                      onClick={() => setShowAffiliateModal(true)}
                      className="button-primary bg-white w-full py-2 px-4 text-sm"
                    >
                      <FiUsers className="inline mr-2" />
                      Become an Affiliate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Affiliate Modal */}
      {showAffiliateModal && (
        <AffiliateSetupModal
          isOpen={showAffiliateModal}
          onClose={() => setShowAffiliateModal(false)}
          contentId={listing._id}
          contentType="listing"
          contentTitle={listing.title}
          mode="become"
          onSuccess={() => {
            // Refresh listing to show updated affiliate status
            fetchListing();
            setShowAffiliateModal(false);
          }}
        />
      )}

      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 