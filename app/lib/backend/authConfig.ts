import connectDB from '@/app/lib/mongodb';
import { Item } from '@/app/models/Item';
import User from '@/app/models/User';
import { CdpClient } from "@coinbase/cdp-sdk";
import mongoose from 'mongoose';
import { AuthOptions, DefaultSession, User as NextAuthUser } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { revalidatePath } from 'next/cache';
import { secrets } from '../config';


interface CustomUser extends NextAuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  wallet?: string | null;
  rootFolder?: string | null;
}

declare module 'next-auth' {
  interface Session {
    user: CustomUser & DefaultSession['user'];
  }
  interface JWT {
    id?: string;
    wallet?: string | null;
    rootFolder?: string | null;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        name: { label: "Name", type: "text" },
        isRegistration: { label: "Is Registration", type: "hidden" }
      },
      async authorize(credentials): Promise<CustomUser | null> {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter an email and password');
        }

        await connectDB();

        const isRegistration = credentials.isRegistration === 'true';

        if (isRegistration) {
          if (!credentials.name) {
            throw new Error('Name is required for registration');
          }

          const session = await mongoose.startSession();
          
          try {
            revalidatePath("/", "layout");
            
            await session.withTransaction(async () => {
              const existingUser = await User.findOne({ email: credentials.email }).session(session);
              if (existingUser) {
                throw new Error('User already exists with this email');
              }

              console.log("Creating wallet account...");
              const cdp = new CdpClient();
              const account = await cdp.evm.createAccount();
              console.log("Wallet account created:", account.address);

              const newUser = new User({
                name: credentials.name,
                email: credentials.email,
                password: credentials.password,
                wallet: account.address
              });

              const rootFolder = new Item({
                name: credentials.email,
                type: 'folder',
                parentId: null,
                owner: newUser._id
              });

              await rootFolder.save({ session });
              newUser.rootFolder = rootFolder._id;
              await newUser.save({ session });

              console.log("User and root folder created successfully");
            });

            const createdUser = await User.findOne({ email: credentials.email });
            
            return {
              id: createdUser!._id.toString(),
              email: createdUser!.email,
              name: createdUser!.name,
              wallet: createdUser!.wallet,
              rootFolder: createdUser!.rootFolder,
            };

          } catch (error: any) {
            console.error("Registration error:", error);
            throw new Error(`Registration failed: ${error.message}`);
          } finally {
            await session.endSession();
          }

        } else {
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
            rootFolder: user.rootFolder,
          };
        }
      }
    })
  ],
  secret: secrets.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT, user?: CustomUser }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.wallet = user.wallet;
        token.rootFolder = user.rootFolder;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: JWT }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.wallet = token.wallet as string | null;
        session.user.rootFolder = token.rootFolder as string | null;
      }
      return session;
    },
  },
};
