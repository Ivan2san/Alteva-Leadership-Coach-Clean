import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

/** ---- Tiny in-file mock so we can see loading/empty/error/success quickly ---- */
type NextAction = { id: string; text: string };
type CheckIn = { id: string; date: string; mood: number; note?: string };

type OverviewData = {
  streakDays: number;
  progressPct: number;
  nextActions: NextAction[];
  recentCheckIns: CheckIn[];
};

function mockFetch(): Promise<OverviewData> {
  return new Promise((resolve, reject) => {
    const url = new URL(window.location.href);
    const fail = url.searchParams.get("fail") === "1";
    const empty = url.searchParams.get("empty") === "1";

    setTimeout(() => {
      if (fail) return reject(new Error("Mock API failed"));
      if (empty) {
        return resolve({
          streakDays: 0,
          progressPct: 0,
          nextActions: [],
          recentCheckIns: [],
        });
      }
      resolve({
        streakDays: 5,
        progressPct: 42,
        nextActions: [
          { id: "a1", text: "Write your weekly goal" },
          { id: "a2", text: "Do today’s 2-minute check-in" },
          { id: "a3", text: "Plan one task for tomorrow" },
        ],
        recentCheckIns: [
          { id: "c1", date: new Date().toISOString().slice(0, 10), mood: 4, note: "Good focus" },
          { id: "c2", date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), mood: 3 },
          { id: "c3", date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), mood: 5, note: "Crushed it" },
        ],
      });
    }, 600);
  });
}

function useOverviewData() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: mockFetch,
    staleTime: 10_000,
  });
}

/** ---- Reusable bits kept local for now; we’ll extract later ---- */
function PageHeader(props: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{props.title}</h1>
      <div className="flex gap-2">{props.children}</div>
    </div>
  );
}

function StatCard(props: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="border rounded-lg p-3 flex flex-col">
      <div className="text-sm text-gray-500">{props.label}</div>
      <div className="text-2xl font-semibold">{props.value}</div>
      {props.hint ? <div className="text-xs text-gray-500 mt-1">{props.hint}</div> : null}
    </div>
  );
}

function EmptyState(props: { title: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-6 text-center text-gray-600">
      <div className="font-medium mb-1">{props.title}</div>
      <div className="text-sm">{props.message}</div>
      {props.action ? <div className="mt-3">{props.action}</div> : null}
    </div>
  );
}

function ErrorNotice(props: { message: string }) {
  return <div className="border border-red-300 bg-red-50 text-red-700 rounded p-3 text-sm">{props.message}</div>;
}

function Loader() {
  return <div className="animate-pulse text-sm text-gray-500">Loading…</div>;
}

/** ---- Page ---- */
export default function Overview() {
  const { data, isLoading, isError, error } = useOverviewData();

  return (
    <div className="space-y-6">
      <PageHeader title="Welcome back">
        <Link href="/daily" className="px-3 py-1 border rounded">Today’s Check-in</Link>
        <Link href="/goals" className="px-3 py-1 border rounded">Add Goal</Link>
      </PageHeader>

      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorNotice message={(error as Error)?.message ?? "Something went wrong"} />
      ) : !data ? null : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="Streak" value={`${data.streakDays} days`} hint="consecutive check-ins" />
            <StatCard label="Progress" value={`${data.progressPct}%`} hint="overall goal progress" />
            <StatCard label="Goals" value={`${Math.max(1, Math.round(data.progressPct / 20))} active`} />
            <StatCard label="Mood (7d avg)" value={`${avgMood(data.recentCheckIns).toFixed(1)}/5`} />
          </div>

          {/* Next actions */}
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Next actions</h2>
            {data.nextActions.length === 0 ? (
              <EmptyState
                title="No suggestions yet"
                message="Once you add goals and check in a few days, we’ll recommend the next 1–3 steps."
                action={<Link href="/goals" className="px-3 py-1 border rounded">Create your first goal</Link>}
              />
            ) : (
              <ul className="list-disc pl-5 space-y-1">
                {data.nextActions.map(a => (
                  <li key={a.id} className="text-sm">{a.text}</li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent check-ins */}
          <section className="space-y-2">
            <h2 className="text-lg font-medium">Recent check-ins</h2>
            {data.recentCheckIns.length === 0 ? (
              <EmptyState
                title="Nothing here yet"
                message="Log your first daily check-in to start your streak."
                action={<Link href="/daily" className="px-3 py-1 border rounded">Today’s Check-in</Link>}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.recentCheckIns.slice(0, 3).map(ci => (
                  <div key={ci.id} className="border rounded-lg p-3">
                    <div className="text-xs text-gray-500">{ci.date}</div>
                    <div className="text-lg font-semibold mt-1">Mood: {ci.mood}/5</div>
                    {ci.note ? <div className="text-sm text-gray-700 mt-1">{ci.note}</div> : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* simple dev toggles */}
      <div className="text-xs text-gray-500">
        Dev toggles: add <code>?empty=1</code> to URL for empty state, <code>?fail=1</code> to mock an error.
      </div>
    </div>
  );
}

function avgMood(items: CheckIn[]): number {
  if (!items.length) return 0;
  return items.reduce((s, i) => s + i.mood, 0) / items.length;
}
