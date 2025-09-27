import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Search, 
  Star, 
  Archive, 
  Download,
  Trash2,
  Calendar,
  Clock,
  MoreVertical,
  TrendingUp,
  Target,
  PieChart,
  Heart,
  Grid3x3,
  MessageCircle,
  CalendarCheck,
  User,
  AlertTriangle
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { topicConfigurations } from "@/lib/topic-configurations";
import { Link } from "wouter";
import { Breadcrumb } from "@/components/breadcrumb";
import { BackButton } from "@/components/back-button";
import type { Conversation } from "@shared/schema";

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading, refetch } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations", { status: activeTab === "all" ? undefined : activeTab, search: searchQuery || undefined }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      if (searchQuery) params.set("search", searchQuery);
      
      const response = await fetch(`/api/conversations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch conversations");
      return response.json();
    },
  });

  // Star conversation mutation
  const starMutation = useMutation({
    mutationFn: async ({ id, isStarred }: { id: string; isStarred: boolean }) => {
      const response = await fetch(`/api/conversations/${id}/star`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isStarred }),
      });
      if (!response.ok) throw new Error("Failed to star conversation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversation updated" });
    },
  });

  // Archive conversation mutation
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/conversations/${id}/archive`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to archive conversation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversation archived" });
    },
  });

  // Delete conversation mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversation deleted" });
    },
  });

  const formatRelativeTime = (date: string | Date | null) => {
    if (!date) return 'Unknown';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const formatTime = (date: string | Date | null) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTopicConfig = (topic: string) => {
    const config = topicConfigurations[topic];
    if (!config) return { title: topic, icon: MessageCircle, color: "blue", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-700" };
    
    const iconMap: Record<string, any> = {
      'fa-user-chart': User,
      'fa-traffic-light': AlertTriangle,
      'fa-target': Target,
      'fa-chart-pie': PieChart,
      'fa-heart': Heart,
      'fa-th': Grid3x3,
      'fa-comments': MessageCircle,
      'fa-calendar-check': CalendarCheck,
    };
    
    const colorMap: Record<string, { color: string; bgColor: string; borderColor: string; textColor: string }> = {
      'growth-profile': { color: 'purple', bgColor: 'bg-purple-50', borderColor: 'border-purple-200', textColor: 'text-purple-700' },
      'red-green-zones': { color: 'amber', bgColor: 'bg-amber-50', borderColor: 'border-amber-200', textColor: 'text-amber-700' },
      'big-practice': { color: 'blue', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
      '360-report': { color: 'green', bgColor: 'bg-green-50', borderColor: 'border-green-200', textColor: 'text-green-700' },
      'growth-values': { color: 'rose', bgColor: 'bg-rose-50', borderColor: 'border-rose-200', textColor: 'text-rose-700' },
      'growth-matrix': { color: 'indigo', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200', textColor: 'text-indigo-700' },
      'oora-conversation': { color: 'teal', bgColor: 'bg-teal-50', borderColor: 'border-teal-200', textColor: 'text-teal-700' },
      'daily-checkin': { color: 'orange', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700' },
    };
    
    const colors = colorMap[topic] || { color: 'gray', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', textColor: 'text-gray-700' };
    
    return {
      title: config.title,
      icon: iconMap[config.icon] || MessageCircle,
      ...colors
    };
  };

  const handleExport = (conversationId: string, format: 'json' | 'txt') => {
    window.open(`/api/conversations/${conversationId}/export?format=${format}`, '_blank');
  };

  const handleDelete = (id: string, title?: string) => {
    if (confirm(`Are you sure you want to delete "${title || 'this conversation'}"? This action cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filter conversations based on search and topic
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.topic.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTopic = !selectedTopic || conv.topic === selectedTopic;
    
    return matchesSearch && matchesTopic;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <BackButton />
      <Breadcrumb items={[{ label: "Conversations", current: true }]} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Conversation History</h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and manage your AI coaching conversations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" data-testid="active-tab">Active</TabsTrigger>
          <TabsTrigger value="archived" data-testid="archived-tab">Archived</TabsTrigger>
          <TabsTrigger value="all" data-testid="all-tab">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 mb-0">
                  <MessageSquare className="h-5 w-5" />
                  Conversations ({filteredConversations.length})
                </CardTitle>
                <Link href="/prompts/growth-profile">
                  <Button data-testid="new-conversation-button" className="w-full sm:w-auto">
                    <span className="sm:hidden">New Chat</span>
                    <span className="hidden sm:inline">Start New Conversation</span>
                  </Button>
                </Link>
              </div>
              <CardDescription>
                Your coaching conversation history and analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search conversations by title, topic, or content..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="search-conversations"
                    />
                  </div>
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:border-gray-600"
                    data-testid="topic-filter"
                  >
                    <option value="">All Topics</option>
                    {Object.entries(topicConfigurations).map(([key, config]) => (
                      <option key={key} value={key}>{config.title}</option>
                    ))}
                  </select>
                </div>
                
                {(searchQuery || selectedTopic) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>Filters active:</span>
                    {searchQuery && (
                      <Badge variant="secondary" className="gap-1">
                        Search: "{searchQuery}"
                        <button 
                          onClick={() => setSearchQuery("")}
                          className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    {selectedTopic && (
                      <Badge variant="secondary" className="gap-1">
                        Topic: {topicConfigurations[selectedTopic]?.title}
                        <button 
                          onClick={() => setSelectedTopic("")}
                          className="ml-1 hover:bg-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    )}
                    <button 
                      onClick={() => { setSearchQuery(""); setSelectedTopic(""); }}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* Conversations Grid */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? "No conversations found" : "No conversations yet"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery 
                      ? "Try adjusting your search terms"
                      : "Start your first AI coaching conversation to see it here"
                    }
                  </p>
                  {!searchQuery && (
                    <Link href="/prompts/growth-profile">
                      <Button>Start Your First Conversation</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredConversations.map((conversation) => {
                    const topicConfig = getTopicConfig(conversation.topic);
                    const messageCount = conversation.messageCount || 0;
                    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                    const IconComponent = topicConfig.icon;
                    
                    return (
                      <Card key={conversation.id} className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-l-4 ${topicConfig.borderColor} ${topicConfig.bgColor}`}>
                        <CardHeader className="pb-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              <div className={`p-3 rounded-lg ${topicConfig.bgColor} border ${topicConfig.borderColor}`}>
                                <IconComponent className={`h-6 w-6 ${topicConfig.textColor}`} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-lg leading-tight mb-2" title={conversation.title || conversation.topic}>
                                  {conversation.title || `${topicConfig.title} Session`}
                                </h3>
                                <div className="flex items-center gap-3">
                                  <Badge className={`${topicConfig.textColor} ${topicConfig.bgColor} border ${topicConfig.borderColor} font-medium`}>
                                    {topicConfig.title}
                                  </Badge>
                                  {conversation.isStarred && (
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                      <span className="text-xs text-yellow-600 font-medium">Starred</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" data-testid={`conversation-menu-${conversation.id}`}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => starMutation.mutate({ id: conversation.id, isStarred: !conversation.isStarred })}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  {conversation.isStarred ? 'Unstar' : 'Star'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExport(conversation.id, 'txt')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export as TXT
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExport(conversation.id, 'json')}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Export as JSON
                                </DropdownMenuItem>
                                {conversation.status === 'active' && (
                                  <DropdownMenuItem
                                    onClick={() => archiveMutation.mutate(conversation.id)}
                                  >
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleDelete(conversation.id, conversation.title || undefined)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-4">
                          {conversation.summary && (
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-3">
                              {conversation.summary}
                            </p>
                          )}
                          
                          {lastMessage && (
                            <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-gray-200/50">
                              <div className="flex items-start gap-2">
                                <div className={`w-2 h-2 rounded-full mt-2 ${lastMessage.sender === 'user' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                <div className="flex-1">
                                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    {lastMessage.sender === 'user' ? 'Your message' : 'AI response'}
                                  </div>
                                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                                    {lastMessage.text.substring(0, 120)}{lastMessage.text.length > 120 ? '...' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1.5">
                                <MessageSquare className="h-4 w-4" />
                                <span className="font-medium">{messageCount}</span>
                                <span className="text-gray-500">messages</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                <span className="font-medium">{formatRelativeTime(conversation.lastMessageAt || conversation.createdAt)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2">
                            <Link href={`/chat/${conversation.topic}?resumeId=${conversation.id}`}>
                              <Button 
                                className={`w-full font-medium ${topicConfig.textColor} ${topicConfig.bgColor} border ${topicConfig.borderColor} hover:opacity-90`} 
                                variant="outline" 
                                data-testid={`resume-conversation-${conversation.id}`}
                              >
                                Continue Conversation
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}