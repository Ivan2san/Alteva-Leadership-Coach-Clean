import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  MessageSquare, 
  Target, 
  Activity,
  BarChart3,
  Calendar,
  Users,
  Clock,
  Award,
  CheckCircle2,
  Circle
} from "lucide-react";
import { format } from "date-fns";
import { topicConfigurations } from "@/lib/topic-configurations";
import { Breadcrumb } from "@/components/breadcrumb";
import { BackButton } from "@/components/back-button";

interface ConversationStats {
  total: number;
  byTopic: { topic: string; count: number; avgMessages: number }[];
  byStatus: { status: string; count: number }[];
  recentActivity: { date: string; count: number }[];
  totalMessages: number;
  avgConversationLength: number;
}

interface TopicEngagement {
  topic: string;
  totalMessages: number;
  avgLength: number;
  lastUsed: string;
}

export default function AnalyticsPage() {
  // Fetch analytics data
  const { data: stats, isLoading: statsLoading } = useQuery<ConversationStats>({
    queryKey: ["/api/analytics/stats"],
  });

  const { data: topicEngagement, isLoading: engagementLoading } = useQuery<TopicEngagement[]>({
    queryKey: ["/api/analytics/topic-engagement"],
  });

  // Fetch checkpoints
  const { data: checkpoints = [], isLoading: checkpointsLoading } = useQuery({
    queryKey: ["/api/checkpoints"],
    queryFn: async () => {
      const res = await fetch("/api/checkpoints", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch checkpoints");
      return res.json();
    },
  });

  const isLoading = statsLoading || engagementLoading || checkpointsLoading;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTopicConfig = (topic: string) => {
    return topicConfigurations[topic] || { title: topic, icon: "💬", color: "blue" };
  };

  // Calculate insights
  const insights = {
    mostActiveWeek: stats?.recentActivity ? Math.max(...stats.recentActivity.map(a => a.count)) : 0,
    topTopics: topicEngagement?.slice(0, 3) || [],
    engagementTrend: stats?.avgConversationLength || 0,
    totalSessions: stats?.total || 0
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton />
      <Breadcrumb items={[{ label: "Analytics", current: true }]} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Leadership Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your leadership development progress and coaching insights
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500" />
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground">Coaching conversations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  Total Messages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
                <p className="text-xs text-muted-foreground">AI interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  Avg Length
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(stats?.avgConversationLength || 0)}</div>
                <p className="text-xs text-muted-foreground">Messages per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-500" />
                  Peak Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{insights.mostActiveWeek}</div>
                <p className="text-xs text-muted-foreground">Sessions in best day</p>
              </CardContent>
            </Card>
          </div>

          {/* Topic Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Leadership Topics Performance
              </CardTitle>
              <CardDescription>
                Your engagement across different leadership development areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topicEngagement && topicEngagement.length > 0 ? (
                <div className="space-y-4">
                  {topicEngagement.map((topic, index) => {
                    const config = getTopicConfig(topic.topic);
                    const engagement = topic.totalMessages;
                    const maxEngagement = Math.max(...topicEngagement.map(t => t.totalMessages));
                    const percentage = maxEngagement > 0 ? (engagement / maxEngagement) * 100 : 0;
                    
                    return (
                      <div key={topic.topic} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{config.icon}</span>
                            <div>
                              <h4 className="font-medium">{config.title}</h4>
                              <p className="text-sm text-muted-foreground">
                                {topic.totalMessages} messages • Avg {Math.round(topic.avgLength)} per session
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={index < 3 ? "default" : "secondary"}>
                              {index < 3 ? `Top ${index + 1}` : 'Active'}
                            </Badge>
                            {topic.lastUsed && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(topic.lastUsed)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No data yet</h3>
                  <p className="text-gray-500">Start coaching conversations to see analytics</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Your coaching activity over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentActivity.slice(-14).map((activity, index) => {
                    const maxActivity = Math.max(...stats.recentActivity.map(a => a.count));
                    const percentage = maxActivity > 0 ? (activity.count / maxActivity) * 100 : 0;
                    
                    return (
                      <div key={activity.date} className="flex items-center gap-4">
                        <div className="w-20 text-sm text-muted-foreground">
                          {formatDate(activity.date)}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-sm font-medium text-right">
                          {activity.count}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">No recent activity</h3>
                  <p className="text-gray-500">Your recent coaching sessions will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leadership Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Leadership Development Insights
              </CardTitle>
              <CardDescription>
                Personalized recommendations based on your coaching patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.totalSessions === 0 ? (
                  <div className="text-center py-8">
                    <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Start Your Journey</h3>
                    <p className="text-gray-500 mb-4">Begin coaching conversations to receive personalized insights</p>
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Engagement Level</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        {insights.engagementTrend >= 10 
                          ? "Excellent! You're having deep, meaningful coaching conversations."
                          : insights.engagementTrend >= 5
                          ? "Good engagement. Consider exploring topics more deeply for greater insights."
                          : "Consider having longer conversations to maximize coaching value."
                        }
                      </p>
                    </div>

                    {insights.topTopics.length > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Top Focus Areas</h4>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          You're most engaged with <strong>{getTopicConfig(insights.topTopics[0].topic).title}</strong>. 
                          Consider exploring complementary areas like communication or strategic thinking.
                        </p>
                      </div>
                    )}

                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Growth Opportunity</h4>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        {stats?.byTopic && stats.byTopic.length < 3
                          ? "Try exploring more leadership topics to develop a well-rounded leadership style."
                          : "You're exploring diverse leadership areas - excellent for comprehensive development!"
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Success Checkpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-500" />
                Success Checkpoints
              </CardTitle>
              <CardDescription>
                Track your leadership development milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { type: 'report_parsed', label: 'Uploaded 360 Report', description: 'Started your leadership journey' },
                  { type: 'first_profile_chat', label: 'First Profile Chat', description: 'Explored your leadership profile' },
                  { type: 'first_brief', label: 'Created First Brief', description: 'Prepared for a key conversation' },
                  { type: 'first_roleplay', label: 'Completed First Role Play', description: 'Practiced a difficult conversation' },
                  { type: 'first_pulse', label: 'Logged First Pulse', description: 'Started tracking your progress' },
                ].map((milestone) => {
                  const achieved = checkpoints.find((cp: any) => cp.type === milestone.type);
                  return (
                    <div 
                      key={milestone.type} 
                      className={`flex items-start gap-4 p-4 rounded-lg border ${
                        achieved 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                          : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {achieved ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-medium ${achieved ? 'text-green-900 dark:text-green-100' : 'text-gray-700 dark:text-gray-300'}`}>
                          {milestone.label}
                        </h4>
                        <p className={`text-sm ${achieved ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                          {milestone.description}
                        </p>
                        {achieved && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Achieved {format(new Date(achieved.achievedAt), 'MMM d, yyyy')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}