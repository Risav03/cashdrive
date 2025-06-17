import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { AffiliateTransaction } from '@/app/models/AffiliateTransaction';
import { User } from '@/app/lib/models';
import { CdpClient } from "@coinbase/cdp-sdk";
import { getUSDCBalanceServer } from '@/app/lib/backend/helperFunctions/blockchainUtils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { transactionIds, payAll } = await request.json();

    if (!transactionIds && !payAll) {
      return NextResponse.json({ error: 'Either provide transactionIds array or set payAll to true' }, { status: 400 });
    }

    let query: any = {
      owner: session.user.id,
      status: 'pending'
    };

    if (!payAll && transactionIds && Array.isArray(transactionIds)) {
      query._id = { $in: transactionIds };
    }

    const pendingTransactions = await AffiliateTransaction.find(query)
      .populate('affiliateUser', 'name email wallet')
      .populate('owner', 'name email wallet');

    if (pendingTransactions.length === 0) {
      return NextResponse.json({ error: 'No pending transactions found' }, { status: 404 });
    }

    const results = [];
    const cdp = new CdpClient({
      apiKeyId: process.env.CDP_API_KEY_ID,
      apiKeySecret: process.env.CDP_API_KEY_SECRET,
      walletSecret: process.env.CDP_WALLET_SECRET,
    });

    for (const transaction of pendingTransactions) {
      try {
        const affiliateUser = transaction.affiliateUser;
        const owner = transaction.owner;

        // Validate that both users have wallets
        if (!affiliateUser.wallet || !owner.wallet) {
          results.push({
            transactionId: transaction._id,
            status: 'failed',
            error: 'Missing wallet address for affiliate or owner'
          });
          
          await AffiliateTransaction.findByIdAndUpdate(transaction._id, {
            status: 'failed',
            metadata: {
              ...transaction.metadata,
              failureReason: 'Missing wallet address',
              processedAt: new Date()
            }
          });
          continue;
        }

        // Get owner's account to send payment
        const ownerAccount = await cdp.evm.getAccount({ address: owner.wallet });
        
        // Check owner's USDC balance using our server-side helper
        const balanceFloat = await getUSDCBalanceServer(owner.wallet);
        console.log(`Owner USDC balance: ${balanceFloat} USDC, commission needed: ${transaction.commissionAmount} USDC`);
        
        if (balanceFloat < transaction.commissionAmount) {
          throw new Error(`Insufficient USDC funds: owner has ${balanceFloat} USDC but needs ${transaction.commissionAmount} USDC for commission`);
        }
        
        // Create the transfer transaction
        const transferResult = await ownerAccount.transfer({
          to: affiliateUser.wallet,
          amount: BigInt(Math.floor(transaction.commissionAmount * 10**6)), // Convert to USDC wei (6 decimals)
          token: 'usdc',
          network: 'base-sepolia'
        });

        // Update transaction as paid
        await AffiliateTransaction.findByIdAndUpdate(transaction._id, {
          status: 'paid',
          paidAt: new Date(),
          metadata: {
            ...transaction.metadata,
            paymentTransaction: transferResult.transactionHash,
            paymentNetwork: 'base-sepolia', // Default to base-sepolia since network property doesn't exist
            processedAt: new Date(),
            paymentMethod: 'blockchain_transfer'
          }
        });

        results.push({
          transactionId: transaction._id,
          status: 'paid',
          paymentHash: transferResult.transactionHash,
          amount: transaction.commissionAmount,
          recipient: affiliateUser.email
        });

      } catch (paymentError: any) {
        console.error(`Payment failed for transaction ${transaction._id}:`, paymentError);
        
        // Mark transaction as failed
        await AffiliateTransaction.findByIdAndUpdate(transaction._id, {
          status: 'failed',
          metadata: {
            ...transaction.metadata,
            failureReason: paymentError.message || 'Payment processing failed',
            processedAt: new Date()
          }
        });

        results.push({
          transactionId: transaction._id,
          status: 'failed',
          error: paymentError.message || 'Payment processing failed'
        });
      }
    }

    const successCount = results.filter(r => r.status === 'paid').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    return NextResponse.json({
      message: `Processed ${results.length} transactions: ${successCount} paid, ${failCount} failed`,
      results,
      summary: {
        total: results.length,
        paid: successCount,
        failed: failCount
      }
    });

  } catch (error: any) {
    console.error('Error processing affiliate payments:', error);
    return NextResponse.json({ 
      error: 'Failed to process payments',
      details: error.message 
    }, { status: 500 });
  }
}

// Get payment status and history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query: any = { owner: session.user.id };
    if (status) {
      query.status = status;
    }

    const transactions = await AffiliateTransaction.find(query)
      .populate('affiliateUser', 'name email wallet')
      .populate('originalTransaction')
      .sort({ createdAt: -1 })
      .limit(100);

    const summary = await AffiliateTransaction.aggregate([
      { $match: { owner: session.user.id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$commissionAmount' }
        }
      }
    ]);

    return NextResponse.json({
      transactions,
      summary: summary.reduce((acc, item) => {
        acc[item._id] = {
          count: item.count,
          amount: item.totalAmount
        };
        return acc;
      }, {})
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}