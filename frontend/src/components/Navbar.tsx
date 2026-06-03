"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store";
import { useEffect, useState } from "react";
import { BarChart3, Menu, X, LogOut, User, ChevronDown, CreditCard } from "lucide-react";

export default function Navbar() {
  const { user, logout, hydrate } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogout = () => {
    logout();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">FinMech</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link href="/models" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Models
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-lg bg-card px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                    {user.name[0].toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                  <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary uppercase">
                    {user.plan}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card shadow-xl">
                    <Link
                      href="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors rounded-t-lg"
                    >
                      <BarChart3 className="h-4 w-4" /> Dashboard
                    </Link>
                    <Link
                      href="/billing"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <CreditCard className="h-4 w-4" /> Billing & Invoices
                    </Link>
                    <Link
                      href="/history"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                    >
                      <User className="h-4 w-4" /> History
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-muted transition-colors rounded-b-lg"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-accent transition-colors"
                >
                  Sign up free
                </Link>
              </div>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-2">
            <Link href="/models" className="block px-2 py-2 text-sm hover:bg-muted rounded" onClick={() => setMenuOpen(false)}>
              Models
            </Link>
            <Link href="/pricing" className="block px-2 py-2 text-sm hover:bg-muted rounded" onClick={() => setMenuOpen(false)}>
              Pricing
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="block px-2 py-2 text-sm hover:bg-muted rounded" onClick={() => setMenuOpen(false)}>
                  Dashboard
                </Link>
                <Link href="/history" className="block px-2 py-2 text-sm hover:bg-muted rounded" onClick={() => setMenuOpen(false)}>
                  History
                </Link>
                <button onClick={handleLogout} className="block w-full text-left px-2 py-2 text-sm text-danger hover:bg-muted rounded">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-2 py-2 text-sm hover:bg-muted rounded" onClick={() => setMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/signup" className="block px-2 py-2 text-sm bg-primary text-primary-foreground rounded text-center" onClick={() => setMenuOpen(false)}>
                  Sign up free
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
