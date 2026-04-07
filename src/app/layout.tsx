import type { Metadata } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { Providers } from "../components/Providers";
import "../index.css";

export const metadata: Metadata = {
  title: "Scamly - AI-Powered Scam Detection",
  description:
    "Protect yourself from scams with Scamly's AI-powered detection. Get detailed analysis of suspicious messages, emails, social media posts, and more.",
  openGraph: {
    type: "website",
    title: "Scamly - AI-Powered Scam Detection",
    description:
      "Protect yourself from scams with Scamly's AI-powered detection. Get detailed analysis of suspicious messages, emails, social media posts, and more.",
    images: [
      {
        url: "https://storage.googleapis.com/gpt-engineer-file-uploads/pNiDDrx70cb0Gd0k4FyzcDg0wfL2/social-images/social-1770457160790-share-image.png",
        width: 1200,
        height: 630,
        alt: "Scamly - AI-Powered Scam Detection",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scamly - AI-Powered Scam Detection",
    description:
      "Protect yourself from scams with Scamly's AI-powered detection. Get detailed analysis of suspicious messages, emails, social media posts, and more.",
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
      </body>
    </html>
  );
}
