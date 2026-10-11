import type { Metadata } from "next";
import "./globals.css";
import WalletProviders from "@/components/WalletProviders";

export const metadata: Metadata = {
  title: "Cheer Up — Group Collection on Solana",
  description: "Cheer Up: on-chain group fundraising with auto reconciliation — pool money with friends, transparent progress, instant settlement",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
