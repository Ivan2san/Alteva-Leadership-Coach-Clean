import React from "react";
import { Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <header className="border-b">
          <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
            <nav className="flex gap-4">
              <Link href="/journey">Overview</Link>
              <Link href="/journey/goals">Goals</Link>
              <Link href="/journey/plan">Plan</Link>
              <Link href="/journey/checkins">Check-ins</Link>
              <Link href="/journey/insights">Insights</Link>
              <Link href="/journey/library">Library</Link>
            </nav>
            <Link href="/journey/checkins/today" className="px-3 py-1 border rounded">
              Today’s Check-in
            </Link>
          </div>
        </header>

        <main className="max-w-5xl mx-auto p-4 flex-1">{children}</main>
      </div>
    </QueryClientProvider>
  );
}

