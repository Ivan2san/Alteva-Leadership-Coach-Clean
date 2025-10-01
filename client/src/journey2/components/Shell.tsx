import React from "react";
import { Link, useLocation } from "wouter";

const links = [
  { to: "/journey/overview", label: "Overview" },
  { to: "/journey/onboarding", label: "Onboarding" },
  { to: "/journey/goals", label: "Goals" },
  { to: "/journey/check-in", label: "Daily check-in" },
  { to: "/journey/insights", label: "Insights" },
  { to: "/journey/library", label: "Library" },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  return (
    <div className="min-h-screen p-6 space-y-6">
      <nav className="flex gap-4">
        {links.map((l) => (
          <Link key={l.to} href={l.to}>
            <a className={`underline-offset-4 ${location === l.to ? "font-bold" : ""}`}>{l.label}</a>
          </Link>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
