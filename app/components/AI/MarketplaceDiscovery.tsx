'use client';

import { purchaseListing } from '@/app/lib/frontend/transactionFunctions';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { FaCheck, FaDollarSign, FaEye, FaShoppingCart, FaSpinner, FaTag, FaTimes, FaUser } from 'react-icons/fa';

interface RelevantListing {
  listing: {
    _id: string;
    title: string;
    description: string;
    price: number;
    tags: string[];
    views: number;
    seller: {
      _id: string;
      name: string;
    };
    item: {
      name: string;
      type: string;
      mimeType: string;
    };
  };
  relevanceScore: number;
  matchReason: string;
}

interface DiscoveryResponse {
  query: string;
  contentType?: string;
  totalFound: number;
  results: RelevantListing[];
  suggestions: string[];
}

interface MarketplaceDiscoveryProps {
  query: string;
  contentType?: string;
  suggestedTitle?: string;
  onPurchaseComplete: (transactionData: any) => void;
}

export default function MarketplaceDiscovery({ 
  query, 
  contentType, 
  suggestedTitle, 
  onPurchaseComplete 
}: MarketplaceDiscoveryProps) {
  const { data: session } = useSession();
  const [discoveryResults, setDiscoveryResults] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasingItems, setPurchasingItems] = useState<Set<string>>(new Set());
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set());

  const discoverContent = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          contentType,
          suggestedTitle,
          maxResults: 5
        })
      });

      if (!response.ok) {
        throw new Error('Failed to discover relevant content');
      }

      const data: DiscoveryResponse = await response.json();
      setDiscoveryResults(data);

    } catch (err: any) {
      setError(err.message || 'Failed to discover content');
    } finally {
      setLoading(false);
    }
  }, [query, contentType, suggestedTitle]);

  const handlePurchase = async (listingId: string) => {
    if (!session?.user?.wallet) {
      alert('Please connect your wallet to make purchases');
      return;
    }

    const listing = discoveryResults?.results.find(r => r.listing._id === listingId);
    if (!listing) return;

    if (!confirm(`Purchase "${listing.listing.title}" for $${listing.listing.price.toFixed(2)}?`)) {
      return;
    }

    setPurchasingItems(prev => new Set(prev).add(listingId));

    try {
      const result = await purchaseListing(listingId, session.user.wallet as `0x${string}`);
      
      setPurchasedItems(prev => new Set(prev).add(listingId));
      
      // Note: File processing for AI happens automatically after purchase
      onPurchaseComplete(result);

    } catch (err: any) {
      alert('Purchase failed: ' + err.message);
    } finally {
      setPurchasingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  // Auto-discover when component mounts or query changes
  useEffect(() => {
    if (query) {
      discoverContent();
    }
  }, [query, contentType, suggestedTitle, discoverContent]);

  if (loading) {
    return (
      <div className="bg-blue-50 border-2 border-black p-4">
        <div className="flex items-center justify-center">
          <FaSpinner className="animate-spin text-blue-600 mr-2" />
          <span className="font-freeman">Discovering relevant marketplace content...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 p-4">
        <div className="flex items-center">
          <FaTimes className="text-red-600 mr-2" />
          <span className="font-freeman text-red-800">{error}</span>
        </div>
        <button
          onClick={discoverContent}
          className="mt-2 bg-red-100 border border-red-300 px-3 py-1 text-sm font-freeman hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!discoveryResults || !discoveryResults.results || discoveryResults.results.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-gray-300 p-4">
        <div className="text-center">
          <h3 className="font-anton text-lg mb-2">No Relevant Content Found</h3>
          <p className="font-freeman text-sm text-gray-600 mb-3">
            We couldn&apos;t find marketplace content that matches your query.
          </p>
          {discoveryResults?.suggestions && discoveryResults.suggestions.length > 0 && (
            <div className="text-left">
              <p className="font-freeman text-sm font-medium mb-2">Suggestions:</p>
              <ul className="list-disc list-inside font-freeman text-sm text-gray-600">
                {discoveryResults.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-purple-50 border-2 border-purple-400 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-anton text-lg">🛍️ Relevant Marketplace Content</h3>
          <p className="font-freeman text-sm text-purple-700">
            Found {discoveryResults.totalFound} items that could enhance your content
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {discoveryResults.results?.map((result) => {
          const { listing, relevanceScore, matchReason } = result;
          const isPurchasing = purchasingItems.has(listing._id);
          const isPurchased = purchasedItems.has(listing._id);
          const isOwnListing = session?.user?.id === listing.seller._id;

          return (
            <div key={listing._id} className="bg-white border-2 border-black p-4 brutal-shadow-left">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-freeman font-bold text-lg">{listing.title}</h4>
                    <div className="flex items-center gap-1">
                      {listing.tags?.slice(0, 2).map((tag, index) => (
                        <span
                          key={index}
                          className="bg-purple-100 border border-purple-300 px-2 py-1 text-xs font-freeman"
                        >
                          <FaTag className="inline mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className="font-freeman text-sm text-gray-700 mb-2 line-clamp-2">
                    {listing.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm font-freeman text-gray-600">
                    <span>
                      <FaUser className="inline mr-1" />
                      {listing.seller.name}
                    </span>
                    <span>
                      <FaEye className="inline mr-1" />
                      {listing.views} views
                    </span>
                    <span className="text-purple-600">
                      Match: {matchReason}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="font-freeman text-lg font-bold">
                      <FaDollarSign className="inline mr-1" />
                      ${listing.price.toFixed(2)}
                    </div>
                    <div className="text-xs font-freeman text-gray-500">
                      {Math.round(relevanceScore)}% match
                    </div>
                  </div>

                  {isOwnListing ? (
                    <div className="bg-blue-100 border border-blue-400 px-3 py-2 text-sm font-freeman text-blue-800">
                      <FaUser className="inline mr-1" />
                      Your Listing
                    </div>
                  ) : isPurchased ? (
                    <div className="bg-green-100 border border-green-400 px-3 py-2 text-sm font-freeman text-green-800">
                      <FaCheck className="inline mr-1" />
                      Purchased
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePurchase(listing._id)}
                      disabled={isPurchasing}
                      className="bg-purple-100 border-2 border-black brutal-shadow-center hover:translate-y-1 transition-all px-4 py-2 font-freeman font-bold disabled:opacity-50"
                    >
                      {isPurchasing ? (
                        <>
                          <FaSpinner className="inline mr-2 animate-spin" />
                          Purchasing...
                        </>
                      ) : (
                        <>
                          <FaShoppingCart className="inline mr-2" />
                          Purchase
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-purple-100 border border-purple-300 rounded">
        <p className="font-freeman text-sm text-purple-800">
          💡 <strong>How it works:</strong> Purchase relevant content to add it to your knowledge base. 
          Files are automatically processed and made AI-ready immediately after purchase.
        </p>
      </div>
    </div>
  );
} 