import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/breadcrumb";
import { Users, Eye, Calendar, MessageSquare, TrendingUp, AlertCircle } from "lucide-react";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

interface RolePlaySession {
  id: string;
  scenario: string;
  persona: string;
  transcript: Array<{ speaker: string; message: string; timestamp: string }>;
  feedback: {
    strengths: string[];
    improvements: string[];
    suggestedLines: string[];
  } | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
}

export default function RolePlayHistoryPage() {
  const [, navigate] = useLocation();
  const [selectedSession, setSelectedSession] = useState<RolePlaySession | null>(null);

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["/api/role-play/sessions"],
    queryFn: async () => {
      const res = await fetch("/api/role-play/sessions", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      return res.json();
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumb items={[
          { label: "Conversations", href: "/conversations" },
          { label: "Role Play History", current: true }
        ]} />

        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Role Play History</h1>
              <p className="text-muted-foreground">Review your past practice sessions and feedback</p>
            </div>
            <Button onClick={() => navigate("/conversations/role-play")}>
              <Users className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No practice sessions yet</h3>
                <p className="text-muted-foreground mb-4">Start your first role play to see it here</p>
                <Button onClick={() => navigate("/conversations/role-play")}>
                  Start First Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {sessions.map((session: RolePlaySession) => (
                <Card key={session.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{session.scenario}</CardTitle>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'} className="flex-shrink-0">
                          {session.status === 'completed' ? 'Completed' : 'In Progress'}
                        </Badge>
                      </div>
                      <CardDescription className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span className="line-clamp-1">{session.persona}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            <span>{session.transcript.length} messages</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(session.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </CardDescription>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedSession(session)}
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Details Dialog */}
      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSession?.scenario}</DialogTitle>
            <DialogDescription>
              Playing: {selectedSession?.persona} • {selectedSession && format(new Date(selectedSession.createdAt), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Transcript */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Transcript
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {selectedSession?.transcript.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      msg.speaker === 'user'
                        ? 'bg-muted ml-8'
                        : 'bg-background border mr-8'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.speaker === 'user' ? 'You' : selectedSession.persona}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(msg.timestamp), 'HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            {selectedSession?.feedback && (
              <div className="space-y-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Feedback
                </h3>

                {selectedSession.feedback.strengths.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <h4 className="font-medium mb-2">What Worked</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback.strengths.map((strength, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {strength}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedSession.feedback.improvements.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <h4 className="font-medium mb-2">Room to Grow</h4>
                    <ul className="space-y-1">
                      {selectedSession.feedback.improvements.map((improvement, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedSession.feedback.suggestedLines.length > 0 && (
                  <div className="p-4 rounded-lg bg-muted border">
                    <h4 className="font-medium mb-2">Suggested Lines</h4>
                    <div className="space-y-2">
                      {selectedSession.feedback.suggestedLines.map((line, index) => (
                        <p key={index} className="text-sm text-muted-foreground italic">
                          "{line}"
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!selectedSession?.feedback && selectedSession?.status === 'completed' && (
              <div className="p-4 rounded-lg bg-muted flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  No feedback available for this session.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
