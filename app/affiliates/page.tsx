'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AffiliateCard from '@/app/components/Affiliates/AffiliateCard';
import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';
import { useUSDCBalance } from '@/app/contexts/USDCBalanceContext';

interface Affiliate {
  _id: string;
  affiliateCode: string;
  commissionRate: number;
  status: 'active' | 'inactive' | 'suspended';
  totalEarnings: number;
  totalSales: number;
  affiliateUser: {
    _id: string;
    name: string;
    email: string;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  listing?: {
    _id: string;
    title: string;
    price: number;
  };
  sharedLink?: {
    _id: string;
    title: string;
    price: number;
    type: string;
    linkId: string;
  };
  createdAt: string;
}

interface AffiliateTransaction {
  _id: string;
  commissionAmount: number;
  commissionRate: number;
  saleAmount: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
  paidAt?: string;
  buyer: {
    name: string;
    email: string;
  };
  affiliate: {
    affiliateCode: string;
  };
  affiliateUser: {
    _id: string;
    name: string;
    email: string;
  };
  owner: {
    _id: string;
    name: string;
    email: string;
  };
}

export default function AffiliatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { balanceFloat: usdcBalance, refreshBalance } = useUSDCBalance();
  const [activeTab, setActiveTab] = useState<'owned' | 'affiliate' | 'transactions'>('owned');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [transactions, setTransactions] = useState<AffiliateTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalOwed: 0,
    pendingCommissions: 0,
    activeAffiliates: 0
  });
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'transactions') {
        const [earnedResponse, paidResponse] = await Promise.all([
          fetch('/api/affiliates/transactions?type=earned'),
          fetch('/api/affiliates/transactions?type=paid')
        ]);

        if (earnedResponse.ok && paidResponse.ok) {
          const earnedData = await earnedResponse.json();
          const paidData = await paidResponse.json();
          
          setTransactions([...earnedData.transactions, ...paidData.transactions]);
          setStats(prev => ({
            ...prev,
            totalEarned: earnedData.summary.paid.amount,
            pendingCommissions: earnedData.summary.pending.amount,
            totalOwed: paidData.summary.pending.amount
          }));
        }
      } else {
        const response = await fetch(`/api/affiliates?type=${activeTab}`);
        if (response.ok) {
          const data = await response.json();
          setAffiliates(data.affiliates);
          
          // Calculate stats
          const activeCount = data.affiliates.filter((a: Affiliate) => a.status === 'active').length;
          setStats(prev => ({
            ...prev,
            activeAffiliates: activeCount
          }));
        }
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAffiliate = async (affiliateId: string, updates: any) => {
    try {
      const response = await fetch(`/api/affiliates/${affiliateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        throw new Error('Failed to update affiliate');
      }
    } catch (error) {
      console.error('Error updating affiliate:', error);
    }
  };

  const handleDeleteAffiliate = async (affiliateId: string) => {
    if (!confirm('Are you sure you want to delete this affiliate?')) return;

    try {
      const response = await fetch(`/api/affiliates/${affiliateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        throw new Error('Failed to delete affiliate');
      }
    } catch (error) {
      console.error('Error deleting affiliate:', error);
    }
  };

  const handleProcessPayments = async (payAll: boolean = false) => {
    if (!confirm(payAll ? 
      'Are you sure you want to pay ALL pending commissions? This will transfer crypto to affiliate wallets.' : 
      'Are you sure you want to pay the selected commissions? This will transfer crypto to affiliate wallets.'
    )) return;

    try {
      setPaymentLoading(true);
      const response = await fetch('/api/affiliates/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds: payAll ? undefined : selectedTransactions,
          payAll
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Payment processing completed!\n${data.summary.paid} payments successful, ${data.summary.failed} failed.`);
        setSelectedTransactions([]);
        fetchData(); // Refresh data
        await refreshBalance(); // Update USDC balance
      } else {
        throw new Error(data.error || 'Failed to process payments');
      }
    } catch (error: any) {
      console.error('Error processing payments:', error);
      alert('Payment processing failed: ' + error.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleTransactionSelect = (transactionId: string, selected: boolean) => {
    if (selected) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      const pendingTransactionIds = transactions
        .filter(t => t.status === 'pending' && t.owner._id === session?.user?.id)
        .map(t => t._id);
      setSelectedTransactions(pendingTransactionIds);
    } else {
      setSelectedTransactions([]);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="heading-text-2 text-6xl font-anton mb-4">
            AFFILIATE PROGRAM
          </h1>
          <p className="font-freeman text-xl max-w-2xl mx-auto">
            Manage your affiliate partnerships and track your earnings
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-green-100 border-2 border-black brutal-shadow-left p-4 text-center">
            <h3 className="font-anton text-2xl">${stats.totalEarned.toFixed(2)}</h3>
            <p className="font-freeman text-sm">Total Earned</p>
          </div>
          <div className="bg-yellow-100 border-2 border-black brutal-shadow-left p-4 text-center">
            <h3 className="font-anton text-2xl">${stats.pendingCommissions.toFixed(2)}</h3>
            <p className="font-freeman text-sm">Pending Commissions</p>
          </div>
          <div className="bg-blue-100 border-2 border-black brutal-shadow-left p-4 text-center">
            <h3 className="font-anton text-2xl">${stats.totalOwed.toFixed(2)}</h3>
            <p className="font-freeman text-sm">Total Owed</p>
          </div>
          <div className="bg-purple-100 border-2 border-black brutal-shadow-left p-4 text-center">
            <h3 className="font-anton text-2xl">{stats.activeAffiliates}</h3>
            <p className="font-freeman text-sm">Active Affiliates</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-2 border-black bg-white mb-6">
          <button
            onClick={() => setActiveTab('owned')}
            className={`flex-1 px-6 py-3 font-freeman border-r-2 border-black ${
              activeTab === 'owned' ? 'bg-[#FFD000]' : 'bg-white hover:bg-gray-50'
            }`}
          >
            My Content Affiliates
          </button>
          <button
            onClick={() => setActiveTab('affiliate')}
            className={`flex-1 px-6 py-3 font-freeman border-r-2 border-black ${
              activeTab === 'affiliate' ? 'bg-[#FFD000]' : 'bg-white hover:bg-gray-50'
            }`}
          >
            My Partnerships
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 px-6 py-3 font-freeman ${
              activeTab === 'transactions' ? 'bg-[#FFD000]' : 'bg-white hover:bg-gray-50'
            }`}
          >
            Transactions
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        ) : error ? (
          <div className="bg-red-100 border-2 border-red-300 p-8 text-center">
            <p className="font-freeman text-lg text-red-700">{error}</p>
            <button
              onClick={fetchData}
              className="mt-4 button-primary bg-[#FFD000] px-6 py-2"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div>
            {activeTab === 'transactions' ? (
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 bg-amber-100 border-2 border-black brutal-shadow-left">
                    <p className="font-freeman text-lg">No transactions found</p>
                  </div>
                ) : (
                  <>
                    {/* Auto-Payout Info */}
                    <div className="bg-green-100 border-2 border-black brutal-shadow-left p-4 mb-6">
                      <h3 className="font-anton text-lg mb-2">🚀 Auto-Commission System</h3>
                      <p className="font-freeman text-sm mb-4">
                        Affiliate commissions are now paid <strong>automatically</strong> after purchase completion! 
                        Once you receive payment, commissions are instantly sent from your wallet to affiliates.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-semibold">✅ Auto-Paid:</span> {transactions.filter(t => (t as any).metadata?.autoPayoutSuccess).length}
                        </div>
                        <div>
                          <span className="font-semibold">⚠️ Auto-Failed:</span> {transactions.filter(t => (t as any).metadata?.autoPayoutFailed).length}
                        </div>
                        <div>
                          <span className="font-semibold">⏳ Manual Pending:</span> {transactions.filter(t => t.status === 'pending' && !(t as any).metadata?.autoPayoutAttempted).length}
                        </div>
                      </div>
                    </div>

                    {/* Manual Payment Controls - Only show if there are failed auto-payouts or old pending transactions */}
                    {transactions.some(t => t.status === 'pending' && t.owner._id === session?.user?.id) && (
                      <div className="bg-blue-100 border-2 border-black brutal-shadow-left p-4 mb-6">
                        <h3 className="font-anton text-lg mb-4">Manual Payment Processing</h3>
                        <p className="font-freeman text-sm mb-4 text-gray-700">
                          For transactions where auto-payout failed or wasn't available:
                        </p>
                        <div className="flex flex-wrap gap-4 items-center">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="selectAll"
                              checked={selectedTransactions.length > 0 && 
                                selectedTransactions.length === transactions.filter(t => t.status === 'pending' && t.owner._id === session?.user?.id).length}
                              onChange={(e) => handleSelectAll(e.target.checked)}
                              className="w-4 h-4"
                            />
                            <label htmlFor="selectAll" className="font-freeman text-sm">
                              Select All Pending ({transactions.filter(t => t.status === 'pending' && t.owner._id === session?.user?.id).length})
                            </label>
                          </div>
                          
                          <button
                            onClick={() => handleProcessPayments(false)}
                            disabled={paymentLoading || selectedTransactions.length === 0}
                            className="button-primary bg-[#FFD000] px-4 py-2 text-sm disabled:opacity-50"
                          >
                            {paymentLoading ? 'Processing...' : `Pay Selected (${selectedTransactions.length})`}
                          </button>
                          
                          <button
                            onClick={() => handleProcessPayments(true)}
                            disabled={paymentLoading}
                            className="button-primary bg-green-100 px-4 py-2 text-sm disabled:opacity-50"
                          >
                            {paymentLoading ? 'Processing...' : 'Pay All Pending'}
                          </button>
                        </div>
                        
                        {selectedTransactions.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="font-freeman text-sm text-gray-600">
                              Total to pay: ${transactions
                                .filter(t => selectedTransactions.includes(t._id))
                                .reduce((sum, t) => sum + t.commissionAmount, 0)
                                .toFixed(2)} USDC
                            </p>
                            <p className="font-freeman text-xs text-gray-500">
                              Your USDC balance: ${usdcBalance.toFixed(2)} USDC
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transactions List */}
                    {transactions.map((transaction) => {
                      const isOwner = transaction.owner._id === session?.user?.id;
                      const isPending = transaction.status === 'pending';
                      const isSelected = selectedTransactions.includes(transaction._id);
                      
                      return (
                        <div key={transaction._id} className="bg-white border-2 border-black brutal-shadow-left p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {isOwner && isPending && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleTransactionSelect(transaction._id, e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                )}
                                <div>
                                  <p className="font-freeman text-sm text-gray-600">
                                    {new Date(transaction.createdAt).toLocaleDateString()}
                                    {transaction.paidAt && (
                                      <span className="ml-2 text-green-600">
                                        • Paid: {new Date(transaction.paidAt).toLocaleDateString()}
                                      </span>
                                    )}
                                  </p>
                                  <p className="font-anton text-lg">
                                    ${transaction.commissionAmount.toFixed(2)} commission
                                  </p>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-freeman">
                                <div>
                                  <p><span className="font-semibold">Rate:</span> {transaction.commissionRate}% of ${transaction.saleAmount.toFixed(2)} sale</p>
                                  <p><span className="font-semibold">Code:</span> {transaction.affiliate.affiliateCode}</p>
                                  {(transaction as any).metadata?.autoPayoutSuccess && (
                                    <p className="text-green-600"><span className="font-semibold">✅ Auto-paid:</span> TX {(transaction as any).metadata.paymentTransaction?.slice(0, 10)}...</p>
                                  )}
                                  {(transaction as any).metadata?.autoPayoutFailed && (
                                    <p className="text-red-600"><span className="font-semibold">⚠️ Auto-payout failed:</span> Requires manual processing</p>
                                  )}
                                </div>
                                <div>
                                  <p><span className="font-semibold">Affiliate:</span> {transaction.affiliateUser.name}</p>
                                  <p><span className="font-semibold">Owner:</span> {transaction.owner.name}</p>
                                  {(transaction as any).metadata?.paymentMethod && (
                                    <p><span className="font-semibold">Payment Method:</span> {(transaction as any).metadata.paymentMethod.replace(/_/g, ' ')}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <span className={`px-3 py-1 text-xs font-freeman border-2 border-black ${
                              transaction.status === 'paid' ? 'bg-green-100' :
                              transaction.status === 'pending' ? 'bg-yellow-100' :
                              'bg-red-100'
                            }`}>
                              {transaction.status.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {affiliates.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-amber-100 border-2 border-black brutal-shadow-left">
                    <p className="font-freeman text-lg">
                      {activeTab === 'owned' 
                        ? 'No affiliates set up for your content yet'
                        : 'You are not an affiliate for any content yet'
                      }
                    </p>
                  </div>
                ) : (
                  affiliates.map((affiliate) => (
                    <AffiliateCard
                      key={affiliate._id}
                      affiliate={affiliate}
                      currentUserId={session.user.id}
                      onUpdate={handleUpdateAffiliate}
                      onDelete={handleDeleteAffiliate}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <FooterPattern design={1} className='w-[80vw] bottom-0 right-0' />
      <FooterPattern design={1} className='w-[80vw] top-0 left-0 -scale-100' />
    </div>
  );
}