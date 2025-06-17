'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { ethers } from 'ethers';
import abi from '@/app/utils/abi/erc20abi';

interface USDCBalanceContextType {
  balance: string | null;
  balanceFloat: number;
  refreshBalance: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const USDCBalanceContext = createContext<USDCBalanceContextType | undefined>(undefined);

export const useUSDCBalance = () => {
  const context = useContext(USDCBalanceContext);
  if (context === undefined) {
    throw new Error('useUSDCBalance must be used within a USDCBalanceProvider');
  }
  return context;
};

interface USDCBalanceProviderProps {
  children: React.ReactNode;
}

export const USDCBalanceProvider: React.FC<USDCBalanceProviderProps> = ({ children }) => {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceFloat, setBalanceFloat] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!session?.user?.wallet) {
      setBalance(null);
      setBalanceFloat(0);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const provider = new ethers.providers.JsonRpcProvider(
        'https://base-sepolia.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq'
      );
      
      const contract = new ethers.Contract(
        '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
        abi,
        provider
      );
      
      const balanceWei = await contract.balanceOf(session.user.wallet as `0x${string}`);
      const balanceInUSDC = balanceWei / 10 ** 6; // USDC has 6 decimals
      
      setBalance(balanceInUSDC.toLocaleString());
      setBalanceFloat(balanceInUSDC);
      
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      setError('Failed to fetch balance');
      setBalance(null);
      setBalanceFloat(0);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.wallet]);

  const refreshBalance = useCallback(async () => {
    await fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    if (session?.user?.wallet) {
      fetchBalance();
    }
  }, [session?.user?.wallet, fetchBalance]);

  // Auto-refresh balance every 30 seconds when user is active
  useEffect(() => {
    if (!session?.user?.wallet) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [session?.user?.wallet, fetchBalance]);

  const value: USDCBalanceContextType = {
    balance,
    balanceFloat,
    refreshBalance,
    isLoading,
    error
  };

  return (
    <USDCBalanceContext.Provider value={value}>
      {children}
    </USDCBalanceContext.Provider>
  );
};

// Helper function to get balance for any wallet address
export const getUSDCBalance = async (walletAddress: string): Promise<number> => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://base-sepolia.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq'
    );
    
    const contract = new ethers.Contract(
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
      abi,
      provider
    );
    
    const balanceWei = await contract.balanceOf(walletAddress);
    const balanceInUSDC = balanceWei / 10 ** 6; // USDC has 6 decimals
    
    return balanceInUSDC;
  } catch (error) {
    console.error('Error fetching USDC balance for address:', walletAddress, error);
    return 0;
  }
};