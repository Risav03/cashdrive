import connectDB from '@/app/lib/mongodb';
import User from '@/app/models/User';
import { AuthOptions, DefaultSession, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { secrets } from '../config';

// Define custom user type
interface CustomUser extends NextAuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  wallet?: string | null;
}

// Extend next-auth types
declare module 'next-auth' {
  interface Session {
    user: CustomUser & DefaultSession['user'];
  }
  interface JWT {
    id?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error('No user found with this email');
        }

        const isPasswordValid = await user.comparePassword(credentials.password);

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          wallet: user.wallet,
        };
      }
    })
  ],
  secret: secrets.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT, user?: CustomUser }) {
      if (user) {
        token.id = user.id;
        token.wallet = user.wallet;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.wallet = token.wallet as string | null;
      }
      return session;
    },
  },
};
