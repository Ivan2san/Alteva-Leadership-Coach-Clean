import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Target, Users, Activity } from "lucide-react";
import Header from "@/components/header";
import ChatMessage from "@/components/chat-message";
import TypingIndicator from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import MainNavigation from "@/components/MainNavigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

    // Build conversation history INCLUDING the current user message
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

  const shortcuts = [
    {
      icon: Target,
      label: 'Prepare',
      description: 'Plan a conversation',
      route: '/conversations/prepare',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      icon: Users,
      label: 'Role Play',
      description: 'Practice it',
      route: '/conversations/role-play',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
    },
    {
      icon: Activity,
      label: 'Pulse',
      description: 'Track progress',
      route: '/conversations/pulse',
      color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-blue-500" />
            Chat
          </h1>
          <p className="text-muted-foreground">
            Ask anything about your leadership journey
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card className="shadow-sm">
              <div className="h-[calc(100vh-380px)] overflow-y-auto p-6 space-y-6">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                    <p className="text-lg mb-2">What's on your mind?</p>
                    <p className="text-sm">Ask me anything. I have context about your leadership profile.</p>
                  </div>
                )}
                
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
                      placeholder="What should I focus on before my mid-year review?"
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

            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Quick Tools</h3>
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <button
                    key={shortcut.route}
                    onClick={() => navigate(shortcut.route)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${shortcut.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <shortcut.icon size={18} />
                      <div>
                        <div className="font-medium text-sm">{shortcut.label}</div>
                        <div className="text-xs opacity-75">{shortcut.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
