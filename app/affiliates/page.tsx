'use client';

import AffiliateCard from '@/app/components/Affiliates/AffiliateCard';
import FooterPattern from '@/app/components/global/FooterPattern';
import Loader from '@/app/components/global/Loader';
import { DashboardCard } from '@/app/components/ui/DashboardCard';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

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

interface Commission {
  _id: string;
  affiliate: Affiliate;
  originalTransaction: {
    _id: string;
    buyer: {
      name: string;
      email: string;
    };
    amount: number;
  };
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'paid' | 'failed';
  createdAt: string;
}

export default function AffiliatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'owned' | 'affiliate' | 'transactions'>('owned');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [transactions, setTransactions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEarned: 0,
    totalOwed: 0,
    pendingCommissions: 0,
    activeAffiliates: 0
  });

  const fetchData = useCallback(async () => {
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
  }, [activeTab]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session, fetchData]);

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

        <DashboardCard />

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
                  transactions.map((transaction) => (
                    <div key={transaction._id} className="bg-white border-2 border-black brutal-shadow-left p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-freeman text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                          <p className="font-anton text-lg">
                            ${transaction.commissionAmount.toFixed(2)} commission
                          </p>
                          <p className="font-freeman text-sm">
                            {transaction.commissionRate}% of ${transaction.originalTransaction.amount.toFixed(2)} sale
                          </p>
                          <p className="font-freeman text-sm">
                            Code: {transaction.affiliate.affiliateCode}
                          </p>
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
                  ))
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