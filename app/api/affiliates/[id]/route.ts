import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/backend/authConfig';
import connectDB from '@/app/lib/mongodb';
import { Affiliate } from '@/app/models/Affiliate';
import { Commission } from '@/app/models/Commission';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const affiliate = await Affiliate.findById(id)
      .populate('owner', 'name email')
      .populate('affiliateUser', 'name email')
      .populate('listing', 'title price status')
      .populate('sharedLink', 'title price type linkId');

    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Check if user has access to this affiliate
    const hasAccess = affiliate.owner._id.toString() === session.user.id || 
                     affiliate.affiliateUser._id.toString() === session.user.id;

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ affiliate });
  } catch (error) {
    console.error('Error fetching affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { commissionRate, status } = await request.json();

    await connectDB();

    const { id } = await params;
    const affiliate = await Affiliate.findById(id);
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Only owner can update commission rate and status
    if (affiliate.owner.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (commissionRate !== undefined) {
      if (commissionRate < 0 || commissionRate > 100) {
        return NextResponse.json({ error: 'Commission rate must be between 0 and 100' }, { status: 400 });
      }
      affiliate.commissionRate = commissionRate;
    }

    if (status !== undefined) {
      if (!['active', 'inactive', 'suspended'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      affiliate.status = status;
    }

    await affiliate.save();
    await affiliate.populate([
      { path: 'owner', select: 'name email' },
      { path: 'affiliateUser', select: 'name email' },
      { path: 'listing', select: 'title price status' },
      { path: 'sharedLink', select: 'title price type linkId' }
    ]);

    return NextResponse.json({ affiliate });
  } catch (error) {
    console.error('Error updating affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, commissionId, status, paidAt } = await request.json();

    await connectDB();

    if (action === 'updateCommission' && commissionId) {
      // Update commission record
      const updatedCommission = await Commission.findByIdAndUpdate(
        commissionId,
        {
          ...(status && { status }),
          ...(paidAt && { paidAt: new Date(paidAt) }),
          updatedAt: new Date()
        },
        { new: true }
      );

      if (!updatedCommission) {
        return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
      }

      return NextResponse.json({
        message: 'Commission updated successfully',
        commission: updatedCommission
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating commission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await params;
    const affiliate = await Affiliate.findById(id);
    if (!affiliate) {
      return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 });
    }

    // Only owner can delete affiliate
    if (affiliate.owner.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Affiliate.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Affiliate deleted successfully' });
  } catch (error) {
    console.error('Error deleting affiliate:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}