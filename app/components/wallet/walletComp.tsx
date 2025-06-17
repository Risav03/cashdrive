'use client';

import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import abi from '@/app/utils/abi/erc20abi';
import { fundWallet } from '@/actions/fundWallet';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { IoCopyOutline } from 'react-icons/io5';
import { FaCheckCircle, FaWallet } from 'react-icons/fa';
import { BiMoney } from 'react-icons/bi';

export const WalletComp = () => {
  const { data: session } = useSession();
  const [balance, setBalance] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function fetchBalance() {
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
  }

  async function fundAcc() {
    try {
      setIsLoading(true);
      const res = await fundWallet(session?.user.wallet as `0x${string}`);

      if (res?.transactionHash) {
        console.log(`Successfully funded wallet ${session?.user.wallet} with USDC`);
        fetchBalance(); // Refresh balance after funding
        setIsModalOpen(false); // Close modal after successful funding
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
  }, [session]);

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className="fixed top-4 right-4 z-40 bg-gray-800/90 
                   backdrop-blur-md shadow-lg rounded-lg px-4 py-1 border-2 border-black
                   cursor-pointer hover:scale-105 transition-all duration-300"
      >
        <div className="flex items-center space-x-3">
          <FaWallet className="h-5 w-5 text-amber-500" />
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white">
              {session?.user.wallet?.slice(0, 6)}...{session?.user.wallet?.slice(-4)}
            </h2>
            <p className="text-sm text-gray-300">
              {balance || '...'} USDC
            </p>
          </div>
        </div>
      </div>

      <Transition appear show={isModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setIsModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden 
                                      rounded-2xl bg-gray-800 p-6 
                                      text-left align-middle shadow-xl transition-all 
                                      border-2 border-black"
                >
                  <div className="flex items-center space-x-2 mb-4">
                    <FaWallet className="h-6 w-6 text-amber-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium text-white"
                    >
                      Wallet Details
                    </Dialog.Title>
                  </div>
                  
                  <div className="mt-2 space-y-4">
                    <div className="flex items-center justify-between p-3 
                                  bg-gray-700 rounded-lg border-2 border-black">
                      <p className="font-mono text-sm text-gray-200 truncate mr-2">
                        {session?.user.wallet}
                      </p>
                      <button
                        onClick={copyToClipboard}
                        className="ml-2 p-2 hover:bg-gray-600 
                                 rounded-full transition-colors duration-200 flex-shrink-0"
                      >
                        {copied ? (
                          <FaCheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <IoCopyOutline className="h-5 w-5 text-gray-300" />
                        )}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={fundAcc}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center space-x-2 
                                 px-4 py-2 bg-amber-500 text-white font-semibold 
                                 rounded-lg shadow-md hover:bg-amber-600 
                                 transition-all duration-300 disabled:opacity-50 
                                 disabled:cursor-not-allowed border-2 border-black"
                      >
                        <div className="flex flex-col justify-center items-center">
                          <div className='flex gap-2 items-center justify-center'>
                            {isLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            ) : (
                              <BiMoney className="h-5 w-5" />
                            )}
                            <span className="text-lg">{isLoading ? 'Funding...' : 'Fund'}</span>
                          </div>
                          <span className="text-xs opacity-75">1 USDC</span>
                        </div>
                      </button>
                      
                      <a 
                        href="https://faucet.circle.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block text-center text-sm text-amber-500 hover:text-amber-400 
                                  transition-colors duration-200 mt-2"
                      >
                        or click here to get more
                      </a>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};
