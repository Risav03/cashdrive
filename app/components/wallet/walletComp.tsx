'use client';

import { fundWallet } from '@/actions/fundWallet';
import abi from '@/app/utils/abi/erc20abi';
import { ethers } from 'ethers';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useState } from 'react';
import { BiMoney } from 'react-icons/bi';
import { FaCheckCircle, FaWallet } from 'react-icons/fa';
import { IoCopyOutline } from 'react-icons/io5';

interface WalletCompProps {
  compact?: boolean;
}

export const WalletComp = ({ compact = false }: WalletCompProps) => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [balance, setBalance] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isHomePage = pathname === '/';

  const fetchBalance = useCallback(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        'https://base-sepolia.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq'
      );
      const contract = new ethers.Contract(
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
        abi,
        provider
      );
      const balance = await contract.balanceOf(session?.user.wallet as `0x${string}`);
      const balanceInEth = balance / 10 ** 6;

      setBalance(balanceInEth.toLocaleString());
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    }
  }, [session?.user.wallet]);

  async function fundAcc() {
    try {
      setIsLoading(true);
      const res = await fundWallet(session?.user.wallet as `0x${string}`);

      if (res?.transactionHash) {
        console.log(`Successfully funded wallet ${session?.user.wallet} with USDC`);
        fetchBalance();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.log('Error funding account:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const copyToClipboard = async () => {
    if (session?.user.wallet) {
      await navigator.clipboard.writeText(session.user.wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (session) {
      fetchBalance();
    }
  }, [session, fetchBalance]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const modal = document.getElementById('wallet-modal');
      if (modal && !modal.contains(event.target as Node)) {
        setIsModalOpen(false);
      }
    };

    if (isModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModalOpen]);

  // Compact mode for AI overlay
  if (compact) {
    // Don't render anything if no session or on auth pages
    if (!session?.user?.wallet || pathname.startsWith('/auth')) {
      return null;
    }
    
    return (
      <>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-amber-100 border-2 border-black px-3 py-2 font-freeman button-primary transition-all duration-100"
        >
          <div className="flex items-center gap-2">
            <FaWallet className="h-4 w-4" />
            <div className="flex flex-col items-start">
              <p className="font-freeman text-xs">
                {session?.user.wallet?.slice(0, 6)}...{session?.user.wallet?.slice(-4)}
              </p>
              <p className="font-freeman font-bold text-xs flex items-center gap-1">
                <BiMoney className="h-3 w-3" />
                <span>{balance || '...'} USDC</span>
              </p>
            </div>
          </div>
        </button>

        {/* Modal Overlay */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

            {/* Modal */}
            <div className="flex items-center justify-center min-h-screen p-4">
              <div 
                id="wallet-modal"
                className="bg-amber-100 border-2 border-black brutal-shadow-left w-full max-w-md 
                           relative transform transition-all"
              >
                {/* Header */}
                <div className="bg-primary border-b-2 border-black p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaWallet className="h-6 w-6" />
                      <h3 className="font-anton text-xl">WALLET DETAILS</h3>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(false)}
                      className="font-freeman text-2xl leading-none hover:opacity-70"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Wallet Address */}
                  <div className="bg-white border-2 border-black brutal-shadow-left p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-sm truncate mr-2">
                        {session?.user.wallet}
                      </p>
                      <button
                        onClick={copyToClipboard}
                        className="button-primary bg-primary p-2 duration-100 "
                      >
                        {copied ? (
                          <FaCheckCircle className="h-5 w-5" />
                        ) : (
                          <IoCopyOutline className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Fund Button */}
                  <div className="space-y-3">
                    <button
                      onClick={fundAcc}
                      disabled={isLoading}
                      className="w-full button-primary bg-primary px-6 py-3 
                               disabled:opacity-50 disabled:cursor-not-allowed duration-100"
                    >
                      <div className="flex flex-col items-center">
                        <div className='flex gap-2 items-center'>
                          {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                          ) : (
                            <BiMoney className="h-5 w-5" />
                          )}
                          <span>{isLoading ? 'Funding...' : 'Fund Wallet'}</span>
                        </div>
                        <span className="text-xs">Get 1 USDC</span>
                      </div>
                    </button>

                    <a 
                      href="https://faucet.circle.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-center font-freeman underline hover:no-underline"
                    >
                      Get more from Circle Faucet →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* Wallet Button - Only show if not on homepage or auth pages and has session */}
      {!isHomePage && !pathname.startsWith('/auth') && session?.user?.wallet && (
        <button 
          onClick={() => setIsModalOpen(true)}
          className="fixed top-4 right-4 z-40 bg-amber-100 border-2 
                     px-4 pb-4 pl-2 py-2 font-freeman button-primary transition-all duration-100"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary p-2  border-2 border-black brutal-shadow-center">
              <FaWallet className="h-5 w-5" />
            </div>
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-2">
                <p className="font-freeman text-sm">
                  {session?.user.wallet?.slice(0, 6)}...{session?.user.wallet?.slice(-4)}
                </p>
                {/* <span className="bg-white px-2 py-0.5 text-xs border-2 border-black brutal-shadow-center">
                  WALLET
                </span> */}
              </div>
              <p className="font-freeman font-bold text-sm flex items-center gap-1">
                <BiMoney className="h-4 w-fit" />
                <span>{balance || '...'} USDC</span>
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

          {/* Modal */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div 
              id="wallet-modal"
              className="bg-amber-100 border-2 border-black brutal-shadow-left w-full max-w-md 
                         relative transform transition-all"
            >
              {/* Header */}
              <div className="bg-primary border-b-2 border-black p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FaWallet className="h-6 w-6" />
                    <h3 className="font-anton text-xl">WALLET DETAILS</h3>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="font-freeman text-2xl leading-none hover:opacity-70"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Wallet Address */}
                <div className="bg-white border-2 border-black brutal-shadow-left p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-sm truncate mr-2">
                      {session?.user.wallet}
                    </p>
                    <button
                      onClick={copyToClipboard}
                      className="button-primary bg-primary p-2 duration-100 "
                    >
                      {copied ? (
                        <FaCheckCircle className="h-5 w-5" />
                      ) : (
                        <IoCopyOutline className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Fund Button */}
                <div className="space-y-3">
                  <button
                    onClick={fundAcc}
                    disabled={isLoading}
                    className="w-full button-primary bg-primary px-6 py-3 
                             disabled:opacity-50 disabled:cursor-not-allowed duration-100"
                  >
                    <div className="flex flex-col items-center">
                      <div className='flex gap-2 items-center'>
                        {isLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                        ) : (
                          <BiMoney className="h-5 w-5" />
                        )}
                        <span>{isLoading ? 'Funding...' : 'Fund Wallet'}</span>
                      </div>
                      <span className="text-xs">Get 1 USDC</span>
                    </div>
                  </button>

                  <a 
                    href="https://faucet.circle.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block text-center font-freeman underline hover:no-underline"
                  >
                    Get more from Circle Faucet →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
