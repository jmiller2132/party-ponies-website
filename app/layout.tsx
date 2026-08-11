import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { Providers } from "./providers";

const roboto = Roboto({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "https://www.partyponiesff.com"),
  title: {
    default: "Party Ponies Fantasy League",
    template: "%s · Party Ponies",
  },
  description: "13+ seasons of Party Ponies fantasy football history — standings, records, PPSI rankings, and rivalry tracking.",
  openGraph: {
    siteName: "Party Ponies Fantasy League",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${roboto.variable} antialiased`}
      >
        <Providers>
          <Navigation />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
