import { useEffect, useRef, useState } from "react";
import { Send, Target, Users, User, TrendingUp, Sparkles } from "lucide-react";
import Header from "@/components/header";
import ChatMessage from "@/components/chat-message";
import TypingIndicator from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MainNavigation from "@/components/MainNavigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import type { Message } from "@shared/schema";

export default function GeneralChat() {
  const [, navigate] = useLocation();
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: userData } = useQuery({
    queryKey: ["/api/user/profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [chatInput]);

  const handleSendMessage = async () => {
    const message = chatInput.trim();
    if (!message || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString(),
    };

    const fullHistory = [...messages, userMessage];

    setMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message,
          topic: "general",
          conversationHistory: fullHistory,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantMsgId = Date.now().toString() + "_ai";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.delta) {
                  assistantMessage += parsed.delta;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    
                    if (lastMsg?.sender === 'ai' && lastMsg.id === assistantMsgId) {
                      newMessages[newMessages.length - 1] = {
                        ...lastMsg,
                        text: assistantMessage,
                      };
                    } else {
                      newMessages.push({
                        id: assistantMsgId,
                        sender: 'ai',
                        text: assistantMessage,
                        timestamp: new Date().toISOString(),
                      });
                    }
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const has360Profile = userData?.lgp360Assessment;
  const hasPersonalValues = userData?.personalValues && Array.isArray(userData.personalValues) && userData.personalValues.length > 0;
  const hasOBP = userData?.obpData;
  const hasImmunity = userData?.immunityToChangeData;
  
  const activeContexts = [
    has360Profile && { label: '360 Profile', icon: '📊', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    hasPersonalValues && { label: 'Personal Values', icon: '⭐', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    hasOBP && { label: 'OBP Objectives', icon: '🎯', color: 'bg-green-50 text-green-700 border-green-200' },
    hasImmunity && { label: 'Immunity Map', icon: '🔄', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  ].filter(Boolean);

  const actionTiles = [
    {
      icon: Target,
      title: 'Prepare for a tough conversation',
      description: 'Get ready for challenging discussions with structured planning',
      route: '/conversations/prepare',
      color: 'hover:border-blue-300 hover:bg-blue-50/50',
    },
    {
      icon: Users,
      title: 'Practice a Conversation',
      description: 'Role-play with AI to build confidence',
      route: '/conversations/role-play',
      color: 'hover:border-purple-300 hover:bg-purple-50/50',
    },
    {
      icon: TrendingUp,
      title: 'Track your progress',
      description: 'Review your growth and celebrate wins',
      route: '/analytics',
      color: 'hover:border-green-300 hover:bg-green-50/50',
    },
    {
      icon: User,
      title: 'Update your profile',
      description: 'Keep your leadership profile current',
      route: '/profile',
      color: 'hover:border-orange-300 hover:bg-orange-50/50',
    },
  ];

  // Show conversation view if there are messages
  if (messages.length > 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MainNavigation />
        
        <main className="max-w-5xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Card className="shadow-sm">
                <div className="h-[calc(100vh-380px)] overflow-y-auto p-6 space-y-6">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  
                  {isTyping && <TypingIndicator />}
                  
                  <div ref={messagesEndRef} />
                </div>

                <div className="border-t p-4 bg-muted/20">
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        placeholder="Ask anything about your leadership journey..."
                        className="w-full p-3 pr-12 border rounded-lg resize-none focus:ring-2 focus:ring-ring min-h-[60px] max-h-32"
                        rows={2}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                      <Button
                        size="sm"
                        className="absolute right-2 bottom-2 p-2"
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isTyping}
                      >
                        <Send size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-4">
              {activeContexts.length > 0 && (
                <Card className="p-4">
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Active Context</h3>
                  <div className="space-y-2 mb-3">
                    {activeContexts.map((context: any, i: number) => (
                      <Badge key={i} variant="outline" className={`w-full justify-start text-xs py-1.5 ${context.color}`}>
                        <span className="mr-2">{context.icon}</span>
                        <span>{context.label}</span>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    I'm using this context to personalize my responses
                  </p>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show welcome view with centered design
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Coach Icon */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            <Sparkles className="text-white" size={32} />
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl font-bold text-foreground">
            How can I help you today?
          </h1>

          {/* Active Context Chips */}
          {activeContexts.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
              {activeContexts.map((context: any, i: number) => (
                <Badge key={i} variant="outline" className={`text-xs py-1.5 px-3 ${context.color}`}>
                  <span className="mr-1.5">{context.icon}</span>
                  <span>{context.label}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="w-full max-w-3xl">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                placeholder="Ask, search, or make anything..."
                className="w-full p-4 pr-12 border-2 rounded-2xl resize-none focus:ring-2 focus:ring-primary min-h-[80px] max-h-48 text-base"
                rows={2}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button
                size="sm"
                className="absolute right-3 bottom-3 rounded-lg"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isTyping}
              >
                <Send size={18} />
              </Button>
            </div>
          </div>

          {/* Get Started Section */}
          <div className="w-full max-w-3xl mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground">Get started</h2>
              <button className="text-sm text-muted-foreground hover:text-foreground">×</button>
            </div>

            {/* Action Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {actionTiles.map((tile) => (
                <button
                  key={tile.route}
                  onClick={() => navigate(tile.route)}
                  className={`text-left p-4 rounded-xl border bg-card transition-all ${tile.color}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                      <tile.icon size={20} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm mb-1">{tile.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{tile.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
