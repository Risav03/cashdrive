import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";
import { Provider } from "./utils/providers/Provider";
import { WalletComp } from "./components/wallet/walletComp";

// const anton = Anton({
//   variable: "--font-anton",
//   subsets: ["latin"],
//   weight: ["400"],
// });

export const metadata: Metadata = {
  title: "Cash Drive",
  description: "Earn money by monetizing your content using our Drive Links",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={` antialiased text-black `}
      >
        <Provider>
          <WalletComp/>
          {children}
        </Provider>
      </body>
    </html>
  );
}
