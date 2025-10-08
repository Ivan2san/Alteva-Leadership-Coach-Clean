import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MessageSquare, MessagesSquare } from "lucide-react";

export default function MainNavigation() {
  const [location, navigate] = useLocation();
  
  const getActiveTab = () => {
    if (location === "/chat" || location.startsWith("/chat/")) return "chat";
    if (location.startsWith("/conversations")) return "conversations";
    if (location === "/profile") return "profile";
    return "chat"; // Default to chat home
  };

  const handleTabChange = (value: string) => {
    if (value === "profile") navigate("/profile");
    if (value === "chat") navigate("/chat");
    if (value === "conversations") navigate("/conversations");
  };

  return (
    <div className="w-full max-w-md mx-auto py-4">
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare size={18} />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessagesSquare size={18} />
            <span>Conversations</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={18} />
            <span>Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
