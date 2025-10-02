import React from "react";
import { Link } from "wouter";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Journey v2</h1>
          <nav className="flex gap-4 text-sm">
            <Link href="/journey" className="hover:underline">Overview</Link>
            <Link href="/journey/goals" className="hover:underline">Goals</Link>
            <Link href="/journey/plan" className="hover:underline">Plan</Link>
            <Link href="/journey/check-ins" className="hover:underline">Check-ins</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
