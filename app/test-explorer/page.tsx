import { getServerSession } from 'next-auth/next';
// import { authOptions } from '../api/auth/[...nextauth]/route';
// import { redirect } from 'next/navigation';
import TestExplorer from '../components/test/TestExplorer';
// import { useSession } from 'next-auth/react';

export default async function TestExplorerPage() {
  // const session = await getServerSession(authOptions);
  // const {data:session} = useSession()
  // if (!session) {
  //   redirect('/auth/signin');
  // }
  return <TestExplorer />;
} 