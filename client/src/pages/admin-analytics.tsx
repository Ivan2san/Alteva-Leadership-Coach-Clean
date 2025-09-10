import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ConversationStats {
  total: number;
  byTopic: { topic: string; count: number; avgMessages: number }[];
  byStatus: { status: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  totalMessages: number;
  avgConversationLength: number;
}

interface UserActivityMetrics {
  userId: string;
  totalConversations: number;
  lastActive: Date | null;
  topicPreferences: string[];
  avgSessionLength: number;
}

interface AnonymizedInsights {
  peakUsageHours: number[];
  popularTopics: { topic: string; percentage: number }[];
  userEngagementTrends: { date: string; activeUsers: number }[];
  avgResponseQuality: number;
}

interface TopicEngagement {
  topic: string;
  totalMessages: number;
  avgLength: number;
  lastUsed: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: overview, isLoading: overviewLoading } = useQuery<ConversationStats>({
    queryKey: ['/api/admin/analytics/overview'],
    enabled: true,
  });

  const { data: userMetrics, isLoading: userLoading } = useQuery<UserActivityMetrics[]>({
    queryKey: ['/api/admin/analytics/users'],
    enabled: activeTab === 'users',
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<AnonymizedInsights>({
    queryKey: ['/api/admin/analytics/insights'],
    enabled: activeTab === 'insights',
  });

  const { data: engagement, isLoading: engagementLoading } = useQuery<TopicEngagement[]>({
    queryKey: ['/api/admin/analytics/engagement'],
    enabled: activeTab === 'engagement',
  });

  if (overviewLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl" data-testid="admin-analytics-dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Leadership Coach Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">Privacy-safe insights and engagement metrics</p>
        
        <Alert className="mt-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            All data shown is anonymized and aggregated. Individual user conversations remain completely private and are not accessible through this dashboard.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4" data-testid="analytics-tabs">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">User Activity</TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">Insights</TabsTrigger>
          <TabsTrigger value="engagement" data-testid="tab-engagement">Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="stat-total-conversations">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.total || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-total-messages">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.totalMessages || 0}</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-avg-length">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversation Length</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.avgConversationLength?.toFixed(1) || 0} msgs</div>
              </CardContent>
            </Card>

            <Card data-testid="stat-active-conversations">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overview?.byStatus?.find(s => s.status === 'active')?.count || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-topic-distribution">
              <CardHeader>
                <CardTitle>Topic Distribution</CardTitle>
                <CardDescription>Conversation count by leadership topic</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overview?.byTopic || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="chart-recent-activity">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Conversations created in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={overview?.recentActivity || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#00C49F" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          {userLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Card data-testid="user-activity-metrics">
              <CardHeader>
                <CardTitle>User Activity Overview</CardTitle>
                <CardDescription>Anonymized user engagement patterns (no personal data)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Active Users</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {userMetrics?.length || 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Conversations per User</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {userMetrics?.length ? 
                          (userMetrics.reduce((sum, user) => sum + user.totalConversations, 0) / userMetrics.length).toFixed(1) : 
                          0
                        }
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session Length</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {userMetrics?.length ? 
                          (userMetrics.reduce((sum, user) => sum + user.avgSessionLength, 0) / userMetrics.length).toFixed(1) : 
                          0
                        } msgs
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      User IDs shown are anonymized identifiers. Actual user conversations and personal data remain completely private.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          {insightsLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="peak-usage-hours">
                <CardHeader>
                  <CardTitle>Peak Usage Hours</CardTitle>
                  <CardDescription>Most active times of day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {insights?.peakUsageHours?.map((hour, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">
                          {hour}:00 - {hour + 1}:00
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Peak #{index + 1}
                        </span>
                      </div>
                    )) || <p className="text-gray-500">No data available</p>}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="popular-topics-chart">
                <CardHeader>
                  <CardTitle>Popular Topics</CardTitle>
                  <CardDescription>Topic preferences by percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={insights?.popularTopics || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ topic, percentage }) => `${topic}: ${percentage.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="percentage"
                      >
                        {insights?.popularTopics?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card data-testid="user-engagement-trends" className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>User Engagement Trends</CardTitle>
                  <CardDescription>Daily active users over the last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={insights?.userEngagementTrends || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {engagementLoading ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Card data-testid="topic-engagement-table">
              <CardHeader>
                <CardTitle>Topic Engagement Details</CardTitle>
                <CardDescription>Detailed metrics for each leadership topic</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200 dark:border-gray-700">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Topic</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Total Messages</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Avg Length</th>
                        <th className="border border-gray-200 dark:border-gray-700 px-4 py-2 text-left">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagement?.map((topic) => (
                        <tr key={topic.topic} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-2 font-medium">
                            {topic.topic}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                            {topic.totalMessages}
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                            {topic.avgLength.toFixed(1)} msgs
                          </td>
                          <td className="border border-gray-200 dark:border-gray-700 px-4 py-2">
                            {topic.lastUsed ? new Date(topic.lastUsed).toLocaleDateString() : 'Never'}
                          </td>
                        </tr>
                      )) || (
                        <tr>
                          <td colSpan={4} className="border border-gray-200 dark:border-gray-700 px-4 py-8 text-center text-gray-500">
                            No engagement data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}