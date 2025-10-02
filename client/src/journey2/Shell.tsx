import React from "react";
import { Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const navLinks = [
  { href: "/", label: "Overview" },
  { href: "/goals", label: "Goals" },
  { href: "/plan", label: "Plan" },
  { href: "/check-ins", label: "Check-ins" },
  { href: "/insights", label: "Insights" },
  { href: "/library", label: "Library" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  
  const isActiveLink = (href: string) => {
    if (href === "/") {
      return location === "/journey" || location === "/journey/";
    }
    return location === `/journey${href}`;
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
            <nav className="flex gap-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <a className={`hover:underline ${isActiveLink(link.href) ? "font-bold" : ""}`}>
                    {link.label}
                  </a>
                </Link>
              ))}
            </nav>
            <Link href="/daily" className="px-3 py-1 border rounded hover:bg-gray-50">
              Today's Check-in
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 flex-1">{children}</main>
      </div>
    </QueryClientProvider>
  );
}
