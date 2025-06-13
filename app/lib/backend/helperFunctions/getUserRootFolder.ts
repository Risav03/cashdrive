import { getServerSession } from 'next-auth/next';
// import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import User from '@/app/models/User';
import connectDB from '@/app/lib/mongodb';
import { useSession } from 'next-auth/react';
import { authOptions } from '../authConfig';

export async function getUserRootFolder() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  await connectDB();
  const user = await User.findById(session.user.id).select('rootFolder');
  if (!user) {
    throw new Error('User not found');
  }

  return user.rootFolder;
}
