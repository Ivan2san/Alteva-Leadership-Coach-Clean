import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { BackButton } from "@/components/back-button";
import { Breadcrumb } from "@/components/breadcrumb";
import { Users, Send, Loader2, TrendingUp, TrendingDown, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import { Badge } from "@/components/ui/badge";

interface Message {
  speaker: "user" | "ai";
  message: string;
  timestamp: string;
}

interface Feedback {
  strengths: string[];
  improvements: string[];
  suggestedLines: string[];
}

export default function RolePlayPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"setup" | "practice" | "feedback">("setup");
  const [isLoading, setIsLoading] = useState(false);
  
  // Setup state
  const [scenario, setScenario] = useState("");
  const [persona, setPersona] = useState("");
  
  // Practice state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Feedback state
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const handleStartSession = async () => {
    if (!scenario.trim() || !persona.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both scenario and persona",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/role-play", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ scenario, persona }),
      });

      if (!response.ok) throw new Error("Failed to start session");

      const session = await response.json();
      setSessionId(session.id);
      
      // Get AI's opening line
      const aiOpening: Message = {
        speaker: "ai",
        message: session.aiOpening || "Let's begin. What did you want to discuss?",
        timestamp: new Date().toISOString(),
      };
      setTranscript([aiOpening]);
      setStep("practice");
      
      toast({
        title: "Session started",
        description: "Ready to practice!",
      });
    } catch (error) {
      toast({
        title: "Failed to start",
        description: "Could not create session. Try again?",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !sessionId) return;

    const userMessage: Message = {
      speaker: "user",
      message: currentMessage.trim(),
      timestamp: new Date().toISOString(),
    };
    
    setTranscript(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsSending(true);

    try {
      const response = await fetch(`/api/role-play/${sessionId}/message`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ message: userMessage.message }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const { aiResponse } = await response.json();
      
      const aiMessage: Message = {
        speaker: "ai",
        message: aiResponse,
        timestamp: new Date().toISOString(),
      };
      
      setTranscript(prev => [...prev, aiMessage]);
    } catch (error) {
      toast({
        title: "Message failed",
        description: "Could not send message. Try again?",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/role-play/${sessionId}/complete`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) throw new Error("Failed to complete session");

      const { feedback: sessionFeedback } = await response.json();
      setFeedback(sessionFeedback);
      setStep("feedback");
      
      toast({
        title: "Session complete",
        description: "Here's your feedback",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not complete session",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "feedback" && feedback) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MainNavigation />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <BackButton />
          <Breadcrumb items={[
            { label: "Conversations", href: "/conversations" },
            { label: "Role Play", current: true }
          ]} />

          <div className="mt-8 space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Well done!</h1>
              <p className="text-muted-foreground">Here's what we noticed</p>
            </div>

            {/* Strengths */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <TrendingUp className="h-5 w-5" />
                  What Worked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                        {index + 1}
                      </Badge>
                      <span className="flex-1">{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Improvements */}
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                  <TrendingDown className="h-5 w-5" />
                  Room to Grow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Badge variant="secondary" className="mt-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">
                        {index + 1}
                      </Badge>
                      <span className="flex-1">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Suggested Lines */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Lightbulb className="h-5 w-5" />
                  Try These Next Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {feedback.suggestedLines.map((line, index) => (
                    <div key={index} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <p className="italic text-sm">&quot;{line}&quot;</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => {
                setStep("setup");
                setSessionId(null);
                setTranscript([]);
                setFeedback(null);
                setScenario("");
                setPersona("");
              }}>
                Practice Again
              </Button>
              <Button onClick={() => navigate("/conversations")}>
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "practice") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MainNavigation />
        
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          <BackButton />
          <Breadcrumb items={[
            { label: "Conversations", href: "/conversations" },
            { label: "Role Play", current: true }
          ]} />

          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Practice</CardTitle>
                    <CardDescription className="mt-1">Playing: {persona}</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleEndSession}
                    disabled={isLoading || transcript.length < 3}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      "End & Get Feedback"
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {transcript.map((msg, index) => (
                    <div 
                      key={index}
                      className={`flex ${msg.speaker === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          msg.speaker === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 dark:bg-gray-800"
                        }`}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-1 ${
                          msg.speaker === "user" ? "text-blue-100" : "text-muted-foreground"
                        }`}>
                          {msg.speaker === "user" ? "You" : persona}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type your response..."
                    rows={3}
                    disabled={isSending}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isSending || !currentMessage.trim()}
                    size="icon"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <BackButton />
        <Breadcrumb items={[
          { label: "Conversations", href: "/conversations" },
          { label: "Role Play", current: true }
        ]} />

        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-purple-100 dark:bg-purple-900/40">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Ready to practice?</CardTitle>
                  <CardDescription className="text-base mt-1">
                    I'll be your difficult stakeholder. Let's rehearse.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="scenario">What's the scenario?</Label>
                <Textarea
                  id="scenario"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  placeholder="e.g., I need to tell my manager that the project deadline is unrealistic and request a two-week extension"
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="persona">Who am I playing?</Label>
                <Input
                  id="persona"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="e.g., My skeptical manager who values deadlines above all"
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={handleStartSession} 
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  "Start Practice"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
