'use client';

import { formatFileSize } from '@/app/lib/frontend/explorerFunctions';
import { deleteListing, formatPrice, getFileIcon, getListing, getStatusColor, hasUserPurchased, purchaseListing } from '@/app/lib/frontend/marketplaceFunctions';
import { Listing } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error loading listing
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    onClick={fetchListing}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try again
                  </button>
                  <Link
                    href="/marketplace"
                    className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-200"
                  >
                    Back to Marketplace
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Listing not found</h1>
            <Link
              href="/marketplace"
              className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Back to Marketplace
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const isOwner = session?.user?.id === listing.seller._id;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Navigation */}
        <nav className="mb-8">
          <Link
            href="/marketplace"
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Back to Marketplace
          </Link>
        </nav>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-4xl">{getFileIcon(listing.item.mimeType)}</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>by {listing.seller.name}</span>
                    <span>•</span>
                    <span>{listing.views} {listing.views === 1 ? 'view' : 'views'}</span>
                    <span>•</span>
                    <span>Listed {new Date(listing.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(listing.status)}`}>
                  {listing.status}
                </span>
                <span className="text-3xl font-bold text-gray-900 mt-2">
                  {formatPrice(listing.price)}
                </span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="md:col-span-2">
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
                </div>

                {listing.tags && listing.tags.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Tags</h2>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* File Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">File Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="text-gray-900 font-medium">{listing.item.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-900">{listing.item.type}</span>
                    </div>
                    {listing.item.size && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Size:</span>
                        <span className="text-gray-900">{formatFileSize(listing.item.size)}</span>
                      </div>
                    )}
                    {listing.item.mimeType && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Format:</span>
                        <span className="text-gray-900">{listing.item.mimeType}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Seller Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Seller</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="text-gray-900 font-medium">{listing.seller.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Wallet:</span>
                      <span className="text-gray-900 font-mono text-xs">
                        {listing.seller.wallet.slice(0, 8)}...{listing.seller.wallet.slice(-8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {!isOwner && listing.status === 'active' && !purchaseSuccess && !alreadyPurchased && !checkingPurchase && (
                    <>
                      <button 
                        onClick={handlePurchase}
                        disabled={purchaseLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {purchaseLoading ? 'Processing Purchase...' : `Purchase for ${formatPrice(listing.price)}`}
                      </button>
                      <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 transition-colors duration-200">
                        Contact Seller
                      </button>
                    </>
                  )}

                  {purchaseSuccess && (
                    <div className="bg-green-100 text-green-800 py-3 px-4 rounded-md text-center">
                      ✅ Purchase completed! File added to your marketplace folder.
                    </div>
                  )}
                  
                  {alreadyPurchased && (
                    <div className="bg-gray-100 text-gray-600 py-3 px-4 rounded-md text-center">
                      You have already purchased this item.
                    </div>
                  )}
                  
                  {checkingPurchase && (
                    <div className="bg-gray-100 text-gray-600 py-3 px-4 rounded-md text-center">
                      Checking purchase status...
                    </div>
                  )}
                  
                  {isOwner && (
                    <div className="space-y-3">
                      <Link
                        href={`/marketplace/${listing._id}/edit`}
                        className="w-full block text-center bg-yellow-600 text-white py-3 px-4 rounded-md hover:bg-yellow-700 transition-colors duration-200"
                      >
                        Edit Listing
                      </Link>
                      {listing.status === 'active' && (
                        <button 
                          onClick={handleRemoveListing}
                          disabled={deleteLoading}
                          className="w-full border border-red-300 text-red-700 py-3 px-4 rounded-md hover:bg-red-50 transition-colors duration-200 disabled:opacity-50"
                        >
                          {deleteLoading ? 'Removing...' : 'Remove Listing'}
                        </button>
                      )}
                    </div>
                  )}
                  
                  {listing.status === 'inactive' && (
                    <div className="bg-gray-100 text-gray-600 py-3 px-4 rounded-md text-center">
                      This listing is currently inactive
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 