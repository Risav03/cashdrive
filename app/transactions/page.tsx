'use client';

import { formatPrice, formatTransactionDate, getFileIcon, getNetworkDisplayName, getTransactionStatusColor, getTransactionTypeColor, getTransactions } from '@/app/lib/frontend/marketplaceFunctions';
import { Transaction, TransactionsResponse } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Loader from '../components/global/Loader';
import FooterPattern from '../components/global/FooterPattern';
import { DashboardCard } from '../components/ui/DashboardCard';
import { getFileIcon as getExplorerFileIcon } from '@/app/lib/frontend/explorerFunctions';
import { FaFolder } from 'react-icons/fa';
import React from 'react';

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalItems: 0
  });
  const [filters, setFilters] = useState({
    type: 'all' as 'purchases' | 'sales' | 'all',
    status: '' as '' | 'completed' | 'pending' | 'failed' | 'refunded',
    page: 1,
    limit: 20
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: TransactionsResponse = await getTransactions({
        type: filters.type === 'all' ? undefined : filters.type,
        status: filters.status || undefined,
        page: filters.page,
        limit: filters.limit
      });
      setTransactions(response.transactions);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTransactions();
    }
  }, [session, filters]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-6xl heading-text-2 font-anton mb-4">TRANSACTION HISTORY</h1>
            <p className="mt-4 text-xl font-freeman">Please log in to view your transaction history</p>
            <Link
              href="/api/auth/signin"
              className="mt-8 inline-block bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
            >
              Sign In
            </Link>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (loading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-6xl heading-text-2 font-anton mb-8">TRANSACTION HISTORY</h1>
            <div className="mt-12 flex justify-center">
              <Loader />
            </div>
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
        <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="text-6xl heading-text-2 font-anton mb-8">TRANSACTION HISTORY</h1>
            <div className="mt-12 bg-white border-2 border-black brutal-shadow-left p-6 max-w-md mx-auto">
              <h3 className="text-xl font-freeman mb-3">Error loading transactions</h3>
              <p className="text-lg mb-4">{error}</p>
              <button
                onClick={fetchTransactions}
                className="bg-primary border-2 border-black brutal-shadow-left px-4 py-2 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
              >
                Try again
              </button>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-7xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-6xl heading-text-2 font-anton mb-4">TRANSACTION HISTORY</h1>
          <p className="text-xl font-freeman">View your purchase and sale history</p>
        </div>

        <DashboardCard />
        
        {/* Filters */}
        <div className="mb-8 bg-primary border-2 border-black brutal-shadow-left p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-lg font-freeman mb-2">
                Transaction Type
              </label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange({ type: e.target.value as any })}
                className="w-full bg-amber-100 border-2 border-black p-2 font-freeman brutal-shadow-left focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Transactions</option>
                <option value="purchases">Purchases</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            
            <div>
              <label className="block text-lg font-freeman mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value as any })}
                className="w-full bg-amber-100 border-2 border-black p-2 font-freeman brutal-shadow-left focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-lg font-freeman">
                {pagination.totalItems} {pagination.totalItems === 1 ? 'transaction' : 'transactions'} found
              </div>
            </div>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-12 bg-white border-2 border-black brutal-shadow-right">
            <h3 className="text-2xl font-anton mb-4">No transactions found</h3>
            <p className="text-lg font-freeman mb-6">
              {filters.type === 'purchases' 
                ? "You haven't made any purchases yet." 
                : filters.type === 'sales'
                ? "You haven't made any sales yet."
                : "You don't have any transactions yet."}
            </p>
            <Link
              href="/marketplace"
              className="inline-block bg-primary border-2 border-black button-primary duration-100 px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <>
            {/* Transactions List */}
            <div className="bg-white border-2 border-black brutal-shadow-left overflow-hidden">
              <ul className="divide-y-2 divide-black">
                {transactions.map((transaction) => (
                  <li key={transaction._id}>
                    <Link
                      href={`/transactions/${transaction._id}`}
                      className="block hover:bg-amber-100 p-4 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {transaction.item.type === 'folder' ? (
                              <FaFolder className="w-8 h-8" />
                            ) : (
                              React.createElement(getExplorerFileIcon(transaction.item.mimeType), {
                                className: "w-8 h-8"
                              })
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-lg font-freeman">
                                {transaction.listing?.title || transaction.metadata?.sharedLinkTitle || transaction.item.name}
                              </p>
                              <span className="px-3 py-1 bg-primary border-2 border-black text-sm font-freeman">
                                {transaction.transactionType}
                              </span>
                              <span className="px-3 py-1 bg-amber-100 border-2 border-black text-sm font-freeman">
                                {transaction.listing ? 'Marketplace' : 'Shared Link'}
                              </span>
                              {transaction.metadata?.blockchainTransaction && (
                                <span className="px-3 py-1 bg-primary border-2 border-black text-sm font-freeman flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                  Verified
                                </span>
                              )}
                            </div>
                            <div className="mt-2 flex items-center text-base font-freeman gap-2">
                              <p>
                                {transaction.transactionType === 'purchase' 
                                  ? `Purchased from ${transaction.seller.name}`
                                  : `Sold to ${transaction.buyer.name}`
                                }
                              </p>
                              <span>•</span>
                              <p>{formatTransactionDate(transaction.purchaseDate)}</p>
                              {transaction.metadata?.network && (
                                <>
                                  <span>•</span>
                                  <p className="capitalize">{getNetworkDisplayName(transaction.metadata.network)}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xl font-freeman">
                              {formatPrice(transaction.amount)}
                            </p>
                            <p className="text-sm font-freeman">
                              {transaction.receiptNumber}
                            </p>
                          </div>
                          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.current - 1)}
                  disabled={pagination.current === 1}
                  className="bg-white border-2 border-black brutal-shadow-left px-4 py-2 font-freeman disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                >
                  Previous
                </button>
                
                {Array.from({ length: pagination.total }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-4 py-2 border-2 border-black font-freeman ${
                      page === pagination.current
                        ? 'bg-primary brutal-shadow-center translate-x-1 translate-y-1'
                        : 'bg-white brutal-shadow-left hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center'
                    } transition-all`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(pagination.current + 1)}
                  disabled={pagination.current === pagination.total}
                  className="bg-white border-2 border-black brutal-shadow-left px-4 py-2 font-freeman disabled:opacity-50 disabled:cursor-not-allowed hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
    </div>
  );
} 