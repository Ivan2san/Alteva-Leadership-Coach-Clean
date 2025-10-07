import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Send, Save } from "lucide-react";
import Header from "@/components/header";
import ChatMessage from "@/components/chat-message";
import TypingIndicator from "@/components/typing-indicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumb } from "@/components/breadcrumb";
import { topicConfigurations } from "@/lib/topic-configurations";
import { useChat } from "@/hooks/use-chat";
import MainNavigation from "@/components/MainNavigation";

interface ChatProps {
  params: { topic: string };
}

export default function Chat({ params }: ChatProps) {
  const [, setLocation] = useLocation();
  const [chatInput, setChatInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const topic = params.topic;
  const config = topicConfigurations[topic];

  // Get resumeId from URL params if present
  const urlParams = new URLSearchParams(window.location.search);
  const resumeId = urlParams.get('resumeId');

  const { messages, isTyping, sendMessage, clearMessages, saveConversation, isConnected } = useChat(resumeId || undefined);

  // Get initial prompt from session storage
  useEffect(() => {
    const initialPrompt = sessionStorage.getItem('currentPrompt');
    if (initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt, topic);
      sessionStorage.removeItem('currentPrompt');
    }
  }, [topic, sendMessage, messages.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [chatInput]);

  if (!config) {
    setLocation("/");
    return null;
  }

  const handleBackToPrompts = () => {
    setLocation(`/prompts/${topic}`);
  };

  const handleNewConversation = () => {
    if (messages.length > 0) {
      if (confirm('Start a new conversation? This will clear the current chat.')) {
        clearMessages();
        setLocation(`/prompts/${topic}`);
      }
    } else {
      setLocation(`/prompts/${topic}`);
    }
  };

  const handleSendMessage = () => {
    const message = chatInput.trim();
    if (!message) return;

    sendMessage(message, topic);
    setChatInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-md mx-auto px-4 py-6">
        <Breadcrumb items={[
          { label: config.title, href: `/prompts/${topic}` },
          { label: "Chat", current: true }
        ]} />
        <div className="flex items-center space-x-3 mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleBackToPrompts}
            data-testid="button-back-prompts"
          >
            <ArrowLeft className="text-muted-foreground" size={16} />
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">AI Coach</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{config.title}</p>
              {isConnected && (
                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 px-2 py-1 rounded">
                  Saved
                </span>
              )}
              {resumeId && (
                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                  Resumed
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {messages.length > 0 && !isConnected && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => saveConversation()}
                title="Save Conversation"
                data-testid="button-save-conversation"
              >
                <Save className="text-muted-foreground" size={16} />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNewConversation}
              title="Start New Conversation"
              data-testid="button-new-conversation"
            >
              <Plus className="text-muted-foreground" size={16} />
            </Button>
          </div>
        </div>

        {/* Chat Messages Container */}
        <div className="space-y-6 mb-6 max-h-[60vh] overflow-y-auto px-2" data-testid="chat-messages">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          
          {isTyping && <TypingIndicator />}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="sticky bottom-0 bg-background pt-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Continue the conversation..."
                className="w-full p-3 pr-12 border border-input rounded-lg resize-none focus:ring-2 focus:ring-ring focus:border-transparent bg-card text-card-foreground min-h-[44px]"
                rows={1}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
                data-testid="textarea-chat-input"
              />
              <Button
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 transition-all duration-200"
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isTyping}
                data-testid="button-send-message"
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
