import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { Providers } from "../components/Providers";
import "../index.css";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: "Scamly - Hands-Free Scam Protection",
  description:
    "Protect yourself from scams with Scamly's hands-free scam protection. Our threat intelligence system monitors your messages and alerts you to suspicious activity.",
  openGraph: {
    type: "website",
    title: "Scamly - Hands-Free Scam Protection",
    description:
      "Protect yourself from scams with Scamly's hands-free scam protection. Our threat intelligence system monitors your messages and alerts you to suspicious activity.",
    images: [
      {
        url: "https://storage.googleapis.com/gpt-engineer-file-uploads/pNiDDrx70cb0Gd0k4FyzcDg0wfL2/social-images/social-1770457160790-share-image.png",
        width: 1200,
        height: 630,
        alt: "Scamly - Hands-Free Scam Protection",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scamly - Hands-Free Scam Protection",
    description:
      "Protect yourself from scams with Scamly's hands-free scam protection. Our threat intelligence system monitors your messages and alerts you to suspicious activity.",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/pNiDDrx70cb0Gd0k4FyzcDg0wfL2/social-images/social-1770457160790-share-image.png",
    ],
  },
  alternates: {
    canonical: "https://scamly.io/",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <GoogleTagManager gtmId="GTM-KJ7DLHSK" />
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
