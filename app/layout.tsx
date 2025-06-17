import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";
import { Provider } from "./utils/providers/Provider";
import { USDCBalanceProvider } from "./contexts/USDCBalanceContext";

import { WalletComp } from "./components/wallet/walletComp";

import { FileViewer } from "./components/FileViewer";


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
          <USDCBalanceProvider>
            <WalletComp/>
            {children}
            <FileViewer />
          </USDCBalanceProvider>
        </Provider>
      </body>
    </html>
  );
}
