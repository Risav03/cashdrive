'use client'
// import { cdp } from '@/app/layout'
import { useSession } from 'next-auth/react'
import React, { useEffect } from 'react'
import {ethers} from 'ethers'
import abi from '@/app/utils/abi/erc20abi'

export const WalletComp = () => {

    
    const {data:session} = useSession()
    const [balance, setBalance] = React.useState<string | null>(null);

    async function fetchBalance(){
        try {
           const provider = new ethers.providers.JsonRpcProvider('https://base-sepolia.g.alchemy.com/v2/CA4eh0FjTxMenSW3QxTpJ7D-vWMSHVjq');
           const contract = new ethers.Contract('0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`, abi, provider);
           const balance = await contract.balanceOf(session?.user.wallet as `0x${string}`);
           const balanceInEth = balance/10**6;
            
            setBalance(balanceInEth.toLocaleString())

        } catch (error) {
            console.error("Error fetching wallet balance:", error);
        }
    }

    useEffect(() => {
        if (session) {
            fetchBalance();
        }
    }, [session]);
  return (
    <div className='absolute top-2 right-2 z-50 h-20'>
        <h2>{session?.user.wallet?.slice(0,4)}...{session?.user.wallet?.slice(-4)}</h2>
        <h3>Balance {balance} USDC</h3>
    </div>
  )
}
