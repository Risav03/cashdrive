'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface AffiliateSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentId: string;
  contentType: 'listing' | 'sharedLink';
  contentTitle: string;
  onSuccess?: (affiliate: any) => void;
  mode?: 'setup' | 'become'; // 'setup' for owners adding affiliates, 'become' for users becoming affiliates
}

interface ReferralUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateCode: string;
  contentId: string;
  contentType: 'listing' | 'sharedLink';
  contentTitle: string;
}

function ReferralUrlModal({ isOpen, onClose, affiliateCode, contentId, contentType, contentTitle }: ReferralUrlModalProps) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const referralUrl = `${baseUrl}/${contentType === 'listing' ? 'marketplace' : 'shared'}/${contentId}?ref=${affiliateCode}`;

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white border-2 border-black brutal-shadow-left max-w-lg w-full">
        <div className="bg-green-100 border-b-2 border-black p-4">
          <div className="flex justify-between items-center">
            <h2 className="font-anton text-xl">🎉 YOU&apos;RE NOW AN AFFILIATE!</h2>
            <button
              onClick={onClose}
              className="text-2xl hover:scale-110 transition-transform"
            >
              ×
            </button>
          </div>
          <p className="font-freeman text-sm mt-1">
            For: {contentTitle}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center mb-4">
            <p className="font-freeman text-lg">
              Start earning commissions by sharing your referral link!
            </p>
          </div>

          <div>
            <label className="block font-freeman text-sm mb-2 font-bold">
              Your Affiliate Code
            </label>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 bg-gray-100 border-2 border-black font-mono text-sm">
                {affiliateCode}
              </code>
              <button
                onClick={() => copyToClipboard(affiliateCode)}
                className="px-3 py-2 border-2 border-black bg-primary font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div>
            <label className="block font-freeman text-sm mb-2 font-bold">
              Your Referral URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-100 border-2 border-black font-freeman text-xs"
              />
              <button
                onClick={() => copyToClipboard(referralUrl)}
                className="px-3 py-2 border-2 border-black bg-primary font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border-2 border-yellow-300 p-3 mt-4">
            <h4 className="font-freeman text-sm font-bold mb-2">💡 How it works:</h4>
            <ul className="font-freeman text-xs space-y-1">
              <li>• Share your referral URL with others</li>
              <li>• When someone purchases through your link, you earn commission</li>
              <li>• Track your earnings in the Affiliates section</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 button-primary bg-[#FFD000] px-4 py-2"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AffiliateSetupModal({
  isOpen,
  onClose,
  contentId,
  contentType,
  contentTitle,
  onSuccess,
  mode = 'setup'
}: AffiliateSetupModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [affiliateEmail, setAffiliateEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(10);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [createdAffiliate, setCreatedAffiliate] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      if (mode === 'become') {
        // User is becoming an affiliate themselves
        const affiliateData = {
          ...(contentType === 'listing' ? { listingId: contentId } : { sharedLinkId: contentId }),
          affiliateUserId: session.user.id, // Use current user's ID
          commissionRate: 10 // Default commission rate, this should come from the listing/sharedLink
        };

        const response = await fetch('/api/affiliates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(affiliateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to become affiliate');
        }

        const { affiliate } = await response.json();
        setCreatedAffiliate(affiliate);
        onSuccess?.(affiliate);
        onClose();
        setShowReferralModal(true);
      } else {
        // Owner is setting up an affiliate for their content
        // First, find the user by email
        const userResponse = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: affiliateEmail })
        });

        if (!userResponse.ok) {
          throw new Error('User not found with that email address');
        }

        const { user } = await userResponse.json();

        // Create the affiliate relationship
        const affiliateData = {
          ...(contentType === 'listing' ? { listingId: contentId } : { sharedLinkId: contentId }),
          affiliateUserId: user._id,
          commissionRate
        };

        const response = await fetch('/api/affiliates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(affiliateData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create affiliate');
        }

        const { affiliate } = await response.json();
        onSuccess?.(affiliate);
        onClose();
        
        // Reset form
        setAffiliateEmail('');
        setCommissionRate(10);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReferralModalClose = () => {
    setShowReferralModal(false);
    setCreatedAffiliate(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white border-2 border-black brutal-shadow-left max-w-md w-full">
          <div className="bg-[#FFD000] border-b-2 border-black p-4">
            <div className="flex justify-between items-center">
              <h2 className="font-anton text-xl">
                {mode === 'become' ? 'BECOME AN AFFILIATE' : 'SET UP AFFILIATE'}
              </h2>
              <button
                onClick={onClose}
                className="text-2xl hover:scale-110 transition-transform"
              >
                ×
              </button>
            </div>
            <p className="font-freeman text-sm mt-1">
              For: {contentTitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {mode === 'become' ? (
              <>
                <div className="text-center mb-4">
                  <p className="font-freeman">
                    Start earning commissions by becoming an affiliate for this content!
                  </p>
                </div>
                <div className="bg-green-50 border-2 border-green-300 p-3">
                  <p className="font-freeman text-sm">
                    You&apos;ll earn commission when people purchase through your referral link.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block font-freeman text-sm mb-2">
                    Affiliate User Email
                  </label>
                  <input
                    type="email"
                    value={affiliateEmail}
                    onChange={(e) => setAffiliateEmail(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black font-freeman focus:outline-none focus:border-[#FFD000]"
                    placeholder="Enter affiliate's email address"
                    required
                  />
                </div>

                <div>
                  <label className="block font-freeman text-sm mb-2">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border-2 border-black font-freeman focus:outline-none focus:border-[#FFD000]"
                    required
                  />
                  <div className="mt-2 text-xs font-freeman text-gray-600">
                    The affiliate will earn {commissionRate}% commission on each sale
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-100 border-2 border-red-300 p-3">
                <p className="font-freeman text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border-2 border-black bg-gray-100 font-freeman hover:translate-x-1 hover:translate-y-1 transition-transform"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 button-primary bg-[#FFD000] px-4 py-2 disabled:opacity-50"
              >
                {loading 
                  ? (mode === 'become' ? 'Joining...' : 'Creating...') 
                  : (mode === 'become' ? 'Become Affiliate' : 'Create Affiliate')
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Referral URL Modal */}
      {showReferralModal && createdAffiliate && (
        <ReferralUrlModal
          isOpen={showReferralModal}
          onClose={handleReferralModalClose}
          affiliateCode={createdAffiliate.affiliateCode}
          contentId={contentId}
          contentType={contentType}
          contentTitle={contentTitle}
        />
      )}
    </>
  );
}