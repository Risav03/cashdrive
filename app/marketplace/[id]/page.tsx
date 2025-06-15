'use client';

import { formatFileSize } from '@/app/lib/frontend/explorerFunctions';
import { deleteListing, formatPrice, getFileIcon, getListing, getStatusColor, hasUserPurchased, purchaseListing } from '@/app/lib/frontend/marketplaceFunctions';
import { Listing } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [alreadyPurchased, setAlreadyPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  const listingId = params.id as string;

  const fetchListing = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getListing(listingId);
      setListing(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch listing');
    } finally {
      setLoading(false);
    }
  };

  const checkPurchaseStatus = async () => {
    if (!session?.user?.id) return;
    
    try {
      setCheckingPurchase(true);
      const purchased = await hasUserPurchased(listingId);
      setAlreadyPurchased(purchased);
    } catch (err: any) {
      console.error('Error checking purchase status:', err);
    } finally {
      setCheckingPurchase(false);
    }
  };

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

    if (!confirm(`Are you sure you want to purchase "${listing?.title}" for ${formatPrice(listing?.price || 0)}?`)) {
      return;
    }

    try {
      setPurchaseLoading(true);
      const result = await purchaseListing(listingId, session.user.wallet as `0x${string}`);
      console.log("Purchase result:", result);
      setPurchaseSuccess(true);

      // Create detailed success message with blockchain info
      let successMessage = `🎉 Purchase Successful!\n\n`;
      successMessage += `📄 Item: ${result.transactionData.transaction.item.name}\n`;
      successMessage += `💰 Amount: ${formatPrice(result.transactionData.transaction.amount)}\n`;
      successMessage += `📋 Receipt: ${result.transactionData.transaction.receiptNumber}\n`;
      successMessage += `📁 File Location: ${result.transactionData.copiedItem.path}\n\n`;
      
      if (result.transactionData.paymentDetails) {
        successMessage += `🔗 Blockchain Details:\n`;
        successMessage += `• Network: ${result.transactionData.paymentDetails.network}\n`;
        successMessage += `• Transaction: ${result.transactionData.paymentDetails.transaction.slice(0, 20)}...\n`;
        successMessage += `• Status: ${result.transactionData.paymentDetails.success ? 'Confirmed' : 'Pending'}\n\n`;
        successMessage += `View full details in your transaction history.`;
      }

      alert(successMessage);
    } catch (err: any) {
      console.log('Purchase error:', err);
      alert('Purchase failed: ' + err);
    } finally {
      setPurchaseLoading(false);
    }
  };

  useEffect(() => {
    if (listingId) {
      fetchListing();
    }
  }, [listingId]);

  useEffect(() => {
    if (session && listingId) {
      checkPurchaseStatus();
    }
  }, [purchaseSuccess, listingId, session]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              LOADING
            </h2>
            <div className="mt-12 flex justify-center">
              <Loader />
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
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              ERROR
            </h2>
            <div className="bg-red-100 border-2 border-black p-8 brutal-shadow-left">
              <h3 className="text-xl font-freeman mb-4">
                Error loading listing
              </h3>
              <p className="font-freeman mb-6">{error}</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={fetchListing}
                  className="button-primary bg-[#FFD000] px-8 py-2"
                >
                  Try again
                </button>
                <Link
                  href="/marketplace"
                  className="button-primary bg-white px-8 py-2"
                >
                  Back to Marketplace
                </Link>
              </div>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center p-8 rounded-lg">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">
              NOT FOUND
            </h2>
            <Link
              href="/marketplace"
              className="button-primary bg-[#FFD000] px-8 py-2"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
        <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
        <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
      </div>
    );
  }

  const isOwner = session?.user?.id === listing.seller._id;

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
          {/* Header - Made more compact */}
          <div className="p-3 border-b-2 border-black">
            {/* Made the layout stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Left side content */}
              <div className="flex items-start gap-3">
                <span className="text-4xl shrink-0">{getFileIcon(listing.item.mimeType)}</span>
                <div className="min-w-0"> {/* Prevent text overflow */}
                  <h1 className="text-xl font-freeman mb-1 break-words">{listing.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-freeman text-gray-700">
                    <span className="break-words">by {listing.seller.name}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{listing.views} {listing.views === 1 ? 'view' : 'views'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Right side content */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                <span className="px-2 py-0.5 bg-[#FFD000] border-2 border-black font-freeman text-sm brutal-shadow-center whitespace-nowrap">
                  {listing.status}
                </span>
                <span className="text-xl font-freeman">
                  {formatPrice(listing.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Content - Adjusted grid and spacing */}
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h2 className="text-lg font-freeman mb-2">Description</h2>
                  <p className="font-freeman text-sm whitespace-pre-wrap">{listing.description}</p>
                </div>

                {listing.tags && listing.tags.length > 0 && (
                  <div>
                    <h2 className="text-lg font-freeman mb-2">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-[#FFD000] border-2 border-black font-freeman text-sm brutal-shadow-center"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Made more compact */}
              <div className="space-y-4">
                {/* File Information */}
                <div className="bg-white border-2 border-black p-3 brutal-shadow-left">
                  <h3 className="text-lg font-freeman mb-2">File Details</h3>
                  <div className="space-y-1.5 font-freeman text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{listing.item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Type:</span>
                      <span>{listing.item.type}</span>
                    </div>
                    {listing.item.size && (
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{formatFileSize(listing.item.size)}</span>
                      </div>
                    )}
                    {listing.item.mimeType && (
                      <div className="flex justify-between">
                        <span>Format:</span>
                        <span>{listing.item.mimeType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller Information */}
                <div className="bg-white border-2 border-black p-3 brutal-shadow-left">
                  <h3 className="text-lg font-freeman mb-2">Seller</h3>
                  <div className="space-y-1.5 font-freeman text-sm">
                    <div className="flex justify-between">
                      <span>Name:</span>
                      <span className="font-medium">{listing.seller.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wallet:</span>
                      <span className="font-mono text-xs">
                        {listing.seller.wallet.slice(0, 6)}...{listing.seller.wallet.slice(-6)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - Adjusted spacing */}
                <div className="space-y-2">
                  {!isOwner && listing.status === 'active' && !purchaseSuccess && !alreadyPurchased && !checkingPurchase && (
                    <>
                      <button 
                        onClick={handlePurchase}
                        disabled={purchaseLoading}
                        className="button-primary bg-[#FFD000] w-full py-2 px-4 text-sm"
                      >
                        {purchaseLoading ? 'Processing Purchase...' : `Purchase for ${formatPrice(listing.price)}`}
                      </button>
                      {/* <button className="button-primary bg-white w-full py-2 px-4 text-sm">
                        Contact Seller
                      </button> */}
                    </>
                  )}

                  {purchaseSuccess && (
                    <div className="bg-green-100 border-2 border-black p-3 font-freeman text-sm brutal-shadow-left">
                      ✅ Purchase completed! File added to your marketplace folder.
                    </div>
                  )}
                  
                  {alreadyPurchased && (
                    <div className="bg-white border-2 border-black p-3 font-freeman text-sm brutal-shadow-left">
                      You have already purchased this item.
                    </div>
                  )}
                  
                  {checkingPurchase && (
                    <div className="bg-white border-2 border-black p-3 font-freeman text-sm brutal-shadow-left">
                      Checking purchase status...
                    </div>
                  )}
                  
                  {isOwner && (
                    <div className="space-y-2">
                      <Link
                        href={`/marketplace/${listing._id}/edit`}
                        className="button-primary bg-[#FFD000] w-full py-2 px-4 text-sm text-center"
                      >
                        Edit Listing
                      </Link>
                      {listing.status === 'active' && (
                        <button 
                          onClick={handleRemoveListing}
                          disabled={deleteLoading}
                          className="button-primary bg-red-100 w-full py-2 px-4 text-sm"
                        >
                          {deleteLoading ? 'Removing...' : 'Remove Listing'}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {listing.status === 'inactive' && (
                    <div className="bg-white border-2 border-black p-3 font-freeman text-sm brutal-shadow-left text-center">
                      This listing is currently inactive
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
} 