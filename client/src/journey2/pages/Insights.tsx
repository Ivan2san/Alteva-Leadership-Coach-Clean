import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader, Flame, Target, CheckCircle, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

type GoalStats = {
  total: number;
  completed: number;
  active: number;
  avgProgress: number;
};

type CheckInTrend = {
  date: string;
  mood: number;
  energy: number;
  focus: number;
};

type CheckIn = {
  id: string;
  userId: string;
  date: string;
  mood: number;
  energy: number | null;
  focus: number | null;
  note: string | null;
  isWeekly: boolean | null;
  createdAt: string;
};

type Goal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number | null;
  targetDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const moodEmojis = ["😢", "😟", "😕", "😐", "🙂", "😊", "😄", "😁", "🤩", "🎉"];

function getMoodEmoji(value: number): string {
  return moodEmojis[value - 1] || "😐";
}

function getMoodColor(value: number): string {
  if (value <= 3) return "text-red-600";
  if (value <= 5) return "text-orange-500";
  if (value <= 7) return "text-yellow-500";
  return "text-green-600";
}

export default function Insights() {
  const { data: streak, isLoading: streakLoading } = useQuery<{ streak: number }>({
    queryKey: ["/api/journey/check-ins/streak"],
    staleTime: 60_000,
  });

  const { data: goalStats, isLoading: goalStatsLoading } = useQuery<GoalStats>({
    queryKey: ["/api/journey/insights/goals"],
    staleTime: 30_000,
  });

  const { data: checkInTrends, isLoading: trendsLoading } = useQuery<CheckInTrend[]>({
    queryKey: ["/api/journey/insights/check-ins/trends"],
    staleTime: 60_000,
  });

  const { data: recentCheckIns, isLoading: checkInsLoading } = useQuery<CheckIn[]>({
    queryKey: ["/api/journey/check-ins", { limit: 5 }],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/check-ins?limit=5");
      return res.json();
    },
    staleTime: 30_000,
  });

  const { data: recentGoals, isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/journey/goals"],
    staleTime: 30_000,
  });

  const isLoading = streakLoading || goalStatsLoading || trendsLoading || checkInsLoading || goalsLoading;

  if (isLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      </Shell>
    );
  }

  const completedPercentage = goalStats?.total 
    ? Math.round((goalStats.completed / goalStats.total) * 100) 
    : 0;

  const formattedTrends = checkInTrends?.map(trend => ({
    ...trend,
    date: format(new Date(trend.date), "MMM dd"),
  })) || [];

  const recentGoalsLimited = recentGoals?.slice(0, 5) || [];

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Insights</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your progress and trends over time
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{streak?.streak || 0} days</div>
              <p className="text-xs text-muted-foreground mt-1">
                Keep checking in daily
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All-time goals created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
              <Activity className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalStats?.active || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently working on
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedPercentage}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {goalStats?.completed || 0} of {goalStats?.total || 0} completed
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mood, Energy & Focus Trends</CardTitle>
            <CardDescription>Your check-in patterns over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {formattedTrends.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No check-in data available yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start checking in daily to see your trends
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={formattedTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Mood"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Energy"
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="focus" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    name="Focus"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Goal Progress Overview</CardTitle>
            <CardDescription>Overall progress across all your goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Average Progress</span>
                <span className="text-muted-foreground">{goalStats?.avgProgress || 0}%</span>
              </div>
              <Progress value={goalStats?.avgProgress || 0} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{goalStats?.active || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{goalStats?.completed || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {(goalStats?.total || 0) - (goalStats?.active || 0) - (goalStats?.completed || 0)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Other</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>Your latest 5 check-ins</CardDescription>
            </CardHeader>
            <CardContent>
              {recentCheckIns && recentCheckIns.length > 0 ? (
                <div className="space-y-3">
                  {recentCheckIns.map((checkIn) => (
                    <div 
                      key={checkIn.id} 
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-3xl ${getMoodColor(checkIn.mood)}`}>
                          {getMoodEmoji(checkIn.mood)}
                        </span>
                        <div>
                          <div className="font-medium text-sm">
                            {format(new Date(checkIn.date), "MMM dd, yyyy")}
                          </div>
                          {checkIn.note && (
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                              {checkIn.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {checkIn.energy && (
                          <Badge variant="outline" className="bg-green-50">
                            E: {checkIn.energy}
                          </Badge>
                        )}
                        {checkIn.focus && (
                          <Badge variant="outline" className="bg-purple-50">
                            F: {checkIn.focus}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No check-ins yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start checking in to track your progress
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Goal Updates</CardTitle>
              <CardDescription>Your latest 5 goal activities</CardDescription>
            </CardHeader>
            <CardContent>
              {recentGoalsLimited.length > 0 ? (
                <div className="space-y-3">
                  {recentGoalsLimited.map((goal) => (
                    <div 
                      key={goal.id} 
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{goal.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Updated {format(new Date(goal.updatedAt), "MMM dd")}
                        </div>
                        {goal.progress !== null && (
                          <Progress value={goal.progress} className="h-1 mt-2" />
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={
                          goal.status === 'active' ? 'bg-green-50 text-green-700' :
                          goal.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                          goal.status === 'paused' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-gray-50 text-gray-700'
                        }
                      >
                        {goal.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Target className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No goals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first goal to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
