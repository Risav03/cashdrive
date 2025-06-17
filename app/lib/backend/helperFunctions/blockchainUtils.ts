import { ethers } from 'ethers';
import abi from '@/app/utils/abi/erc20abi';

// Server-side helper function to get USDC balance for any wallet address
export const getUSDCBalanceServer = async (walletAddress: string): Promise<number> => {
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