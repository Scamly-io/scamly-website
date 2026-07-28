'use client'

import Link from "next/link";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import logoLight from "../../public/navbar-logo.png";

/* ARCHIVED: full marketing nav during sunset
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { trackSignupStarted } from "../lib/analytics";

  const [isOpen, setIsOpen] = useState(false);
  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#pricing", label: "Pricing" },
    { href: "/#about", label: "About" },
    { href: "/blog", label: "Blog" },
  ];
  // + mobile menu + Get Started CTA
*/

export function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-[1280px] rounded-2xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-sm">
      <div className="px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="flex items-center group">
            <img src={logoLight.src} alt="Scamly" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <Button className="bg-[#5022f6] text-primary-foreground hover:bg-[#5022f6]/90" size="sm" asChild>
                <Link href="/portal">My Account</Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
