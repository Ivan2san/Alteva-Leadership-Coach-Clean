import React from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";

/** ---- Types ---- */
type NextAction = { 
  id: string; 
  text: string;
  status: string;
};

type CheckIn = { 
  id: string; 
  date: string; 
  mood: number; 
  note?: string | null;
};

type GoalStats = {
  total: number;
  completed: number;
  active: number;
  avgProgress: number;
};

/** ---- Custom Hooks ---- */
function useCheckInStreak() {
  return useQuery<{ streak: number }>({
    queryKey: ["/api/journey/check-ins/streak"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/check-ins/streak");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useGoalStats() {
  return useQuery<GoalStats>({
    queryKey: ["/api/journey/insights/goals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/insights/goals");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useNextActions() {
  return useQuery<NextAction[]>({
    queryKey: ["/api/journey/next-actions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/next-actions");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useRecentCheckIns() {
  return useQuery<CheckIn[]>({
    queryKey: ["/api/journey/check-ins", { limit: 7 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/check-ins?limit=7");
      return res.json();
    },
    staleTime: 30_000,
  });
}

/** ---- Reusable Components ---- */
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

/** ---- Helper Functions ---- */
function avgMood(items: CheckIn[]): number {
  if (!items.length) return 0;
  return items.reduce((s, i) => s + i.mood, 0) / items.length;
}

/** ---- Page Component ---- */
export default function Overview() {
  const streakQuery = useCheckInStreak();
  const goalStatsQuery = useGoalStats();
  const nextActionsQuery = useNextActions();
  const recentCheckInsQuery = useRecentCheckIns();

  const isLoading =
    streakQuery.isLoading ||
    goalStatsQuery.isLoading ||
    nextActionsQuery.isLoading ||
    recentCheckInsQuery.isLoading;

  const isError =
    streakQuery.isError ||
    goalStatsQuery.isError ||
    nextActionsQuery.isError ||
    recentCheckInsQuery.isError;

  const error =
    streakQuery.error ||
    goalStatsQuery.error ||
    nextActionsQuery.error ||
    recentCheckInsQuery.error;

  const streakData = streakQuery.data;
  const goalStats = goalStatsQuery.data;
  const nextActionsData = nextActionsQuery.data || [];
  const recentCheckIns = recentCheckInsQuery.data || [];

  // Filter next actions to show only pending/in_progress, limit to 3
  const filteredNextActions = nextActionsData
    .filter(action => action.status === "pending" || action.status === "in_progress")
    .slice(0, 3);

  return (
    <Shell>
      <div className="space-y-6">
        <PageHeader title="Welcome back">
          <Link href="/check-ins" className="px-3 py-1 border rounded">Today's Check-in</Link>
          <Link href="/goals" className="px-3 py-1 border rounded">Add Goal</Link>
        </PageHeader>

        {isLoading ? (
          <Loader />
        ) : isError ? (
          <ErrorNotice message={(error as Error)?.message ?? "Something went wrong"} />
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard 
                label="Streak" 
                value={`${streakData?.streak || 0} days`} 
                hint="consecutive check-ins" 
              />
              <StatCard 
                label="Progress" 
                value={`${Math.round(goalStats?.avgProgress || 0)}%`} 
                hint="overall goal progress" 
              />
              <StatCard 
                label="Goals" 
                value={`${goalStats?.active || 0} active`} 
              />
              <StatCard 
                label="Mood (7d avg)" 
                value={`${avgMood(recentCheckIns).toFixed(1)}/10`} 
              />
            </div>

            {/* Next actions */}
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Next actions</h2>
              {filteredNextActions.length === 0 ? (
                <EmptyState
                  title="No suggestions yet"
                  message="Once you add goals and check in a few days, we'll recommend the next 1–3 steps."
                  action={<Link href="/goals" className="px-3 py-1 border rounded">Create your first goal</Link>}
                />
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {filteredNextActions.map(a => (
                    <li key={a.id} className="text-sm">{a.text}</li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent check-ins */}
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Recent check-ins</h2>
              {recentCheckIns.length === 0 ? (
                <EmptyState
                  title="Nothing here yet"
                  message="Log your first daily check-in to start your streak."
                  action={<Link href="/check-ins" className="px-3 py-1 border rounded">Today's Check-in</Link>}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {recentCheckIns.slice(0, 3).map(ci => (
                    <div key={ci.id} className="border rounded-lg p-3">
                      <div className="text-xs text-gray-500">{ci.date}</div>
                      <div className="text-lg font-semibold mt-1">Mood: {ci.mood}/10</div>
                      {ci.note ? <div className="text-sm text-gray-700 mt-1">{ci.note}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
