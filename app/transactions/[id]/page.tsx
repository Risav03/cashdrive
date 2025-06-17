'use client';

import { copyToClipboard, formatBlockchainAddress, formatPrice, formatTransactionDate, getBlockExplorerUrl, getFileIcon, getNetworkDisplayName, getTransaction, getTransactionStatusColor, getTransactionTypeColor } from '@/app/lib/frontend/marketplaceFunctions';
import { Transaction } from '@/app/lib/types';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createElement, useEffect, useState } from 'react';
import Loader from '@/app/components/global/Loader';
import FooterPattern from '@/app/components/global/FooterPattern';

export default function TransactionDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transactionId = params.id as string;

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTransaction(transactionId);
      setTransaction(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (transactionId && session) {
      fetchTransaction();
    }
  }, [transactionId, session]);

  if (!session) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h1 className="heading-text-2 text-6xl font-anton mb-4">TRANSACTION DETAILS</h1>
            <p className="text-xl font-freeman mb-8">Please log in to view transaction details</p>
            <Link
              href="/api/auth/signin"
              className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all inline-block"
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">LOADING</h2>
            <div className='flex justify-center items-center mt-10'>
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
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">ERROR</h2>
            <div className="bg-white border-2 border-black brutal-shadow-left p-6">
              <h3 className="text-xl font-freeman mb-4">Error loading transaction</h3>
              <p className="font-freeman mb-6">{error}</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={fetchTransaction}
                  className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                >
                  Try again
                </button>
                <Link
                  href="/transactions"
                  className="bg-white border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                >
                  Back to Transactions
                </Link>
              </div>
            </div>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-white relative">
        <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <h2 className="heading-text-2 text-6xl font-anton mb-8">NOT FOUND</h2>
            <Link
              href="/transactions"
              className="bg-primary border-2 border-black brutal-shadow-left px-6 py-3 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all inline-block"
            >
              Back to Transactions
            </Link>
          </div>
        </main>
        <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <main className="max-w-4xl mx-auto py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Navigation */}
        <nav className="mb-8 print:hidden">
          <Link
            href="/transactions"
            className="button-primary bg-white px-4 py-1.5 inline-flex items-center font-freeman text-sm"
          >
            ← Back to Transactions
          </Link>
        </nav>

        {/* Receipt */}
        <div className="bg-amber-100 border-2 border-black brutal-shadow-left">
          {/* Header */}
          <div className="p-6 border-b-2 border-black bg-primary">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-anton">Transaction Receipt</h1>
                <p className="font-freeman">Receipt #{transaction.receiptNumber}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-white border-2 border-black brutal-shadow-center font-freeman">
                  {transaction.transactionType}
                </span>
                <span className="px-3 py-1 bg-white border-2 border-black brutal-shadow-center font-freeman">
                  {transaction.listing ? 'Marketplace' : 'Shared Link'}
                </span>
                <span className="px-3 py-1 bg-white border-2 border-black brutal-shadow-center font-freeman">
                  {transaction.status}
                </span>
                <button
                  onClick={handlePrint}
                  className="print:hidden bg-secondary border-2 border-black brutal-shadow-left px-4 py-2 font-freeman hover:translate-x-1 hover:translate-y-1 hover:brutal-shadow-center transition-all"
                >
                  Print Receipt
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Transaction Details */}
              <div className="bg-white border-2 border-black brutal-shadow-left p-4">
                <h2 className="text-xl font-anton mb-4">Transaction Details</h2>
                <div className="space-y-3 font-freeman">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Transaction ID:</span>
                    <span className="text-gray-900 font-mono text-sm">{transaction.transactionId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">{formatTransactionDate(transaction.purchaseDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount:</span>
                    <span className="text-gray-900 font-semibold text-lg">{formatPrice(transaction.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTransactionStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source:</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.listing ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {transaction.listing ? 'Marketplace Purchase' : 'Monetized Shared Link'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Blockchain Details */}
              {transaction.metadata?.blockchainTransaction && (
                <div className="bg-white border-2 border-black brutal-shadow-left p-4">
                  <h2 className="text-xl font-anton mb-4">Blockchain Details</h2>
                  <div className="space-y-3 font-freeman">
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Transaction Hash:</span>
                      <div className="text-right">
                        <span className="text-gray-900 font-mono text-sm break-all">
                          {formatBlockchainAddress(transaction.metadata.blockchainTransaction)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(transaction.metadata?.blockchainTransaction || '', 'Transaction hash copied!')}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                          title="Copy transaction hash"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Network:</span>
                      <span className="text-gray-900">{getNetworkDisplayName(transaction.metadata?.network || '')}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-gray-500">Payer Wallet:</span>
                      <div className="text-right">
                        <span className="text-gray-900 font-mono text-sm">
                          {formatBlockchainAddress(transaction.metadata?.payer || '')}
                        </span>
                        <button
                          onClick={() => copyToClipboard(transaction.metadata?.payer || '', 'Wallet address copied!')}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-xs"
                          title="Copy wallet address"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.metadata?.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.metadata?.success ? 'Confirmed' : 'Failed'}
                      </span>
                    </div>
                    <div className="mt-4">
                      <a
                        href={getBlockExplorerUrl(transaction.metadata?.network || '', transaction.metadata?.blockchainTransaction || '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on Block Explorer
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Parties */}
              <div className={`${transaction.metadata?.blockchainTransaction ? 'md:col-span-2' : ''} bg-white border-2 border-black brutal-shadow-left p-4`}>
                <h2 className="text-xl font-anton mb-4">
                  {transaction.transactionType === 'purchase' ? 'Purchase Details' : 'Sale Details'}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-freeman">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      {transaction.transactionType === 'purchase' ? 'Seller' : 'Buyer'}
                    </h3>
                    <div className="mt-1">
                      <p className="text-gray-900">
                        {transaction.transactionType === 'purchase' ? transaction.seller.name : transaction.buyer.name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {transaction.transactionType === 'purchase' 
                          ? `${transaction.seller.wallet.slice(0, 8)}...${transaction.seller.wallet.slice(-8)}`
                          : `${transaction.buyer.wallet.slice(0, 8)}...${transaction.buyer.wallet.slice(-8)}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">
                      {transaction.transactionType === 'purchase' ? 'Buyer' : 'Seller'}
                    </h3>
                    <div className="mt-1">
                      <p className="text-gray-900">
                        {transaction.transactionType === 'purchase' ? transaction.buyer.name : transaction.seller.name}
                      </p>
                      <p className="text-xs text-gray-500 font-mono">
                        {transaction.transactionType === 'purchase' 
                          ? `${transaction.buyer.wallet.slice(0, 8)}...${transaction.buyer.wallet.slice(-8)}`
                          : `${transaction.seller.wallet.slice(0, 8)}...${transaction.seller.wallet.slice(-8)}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="mt-8 border-t-2 border-black pt-6">
              <div className="bg-white border-2 border-black brutal-shadow-left p-4">
                <h2 className="text-xl font-anton mb-4">Item Details</h2>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-4xl">{createElement(getFileIcon(transaction.item.mimeType), { className: "w-6 h-6" })}</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{transaction.listing?.title || transaction.metadata?.sharedLinkTitle || transaction.item.name}</h3>
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">File Name:</span>
                        <span className="ml-2 text-gray-900">{transaction.item.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">File Type:</span>
                        <span className="ml-2 text-gray-900">{transaction.item.type}</span>
                      </div>
                      {transaction.item.size && (
                        <div>
                          <span className="text-gray-500">File Size:</span>
                          <span className="ml-2 text-gray-900">{(transaction.item.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                      )}
                      {transaction.item.mimeType && (
                        <div>
                          <span className="text-gray-500">MIME Type:</span>
                          <span className="ml-2 text-gray-900">{transaction.item.mimeType}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Access Information */}
            {transaction.transactionType === 'purchase' && transaction.status === 'completed' && (
              <div className="mt-6 bg-primary border-2 border-black brutal-shadow-left p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-anton mb-2">
                      File Access Granted
                    </h3>
                    <p className="font-freeman">
                      The purchased file has been copied to your marketplace folder in your file manager. 
                      You now have unlimited access to this file.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 border-black text-center font-freeman">
              <p>This is an official transaction receipt.</p>
              <p className="mt-1">Transaction processed on {formatTransactionDate(transaction.createdAt)}</p>
            </div>
          </div>
        </div>
      </main>
      <FooterPattern design={1} className=' w-[80vw] bottom-0 right-0 ' />
      <FooterPattern design={1} className=' w-[80vw] top-0 left-0 -scale-100 ' />
    </div>
  );
} 