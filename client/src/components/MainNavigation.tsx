import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, MessageSquare, MessagesSquare } from "lucide-react";

export default function MainNavigation() {
  const [location, navigate] = useLocation();
  
  const getActiveTab = () => {
    if (location === "/profile") return "profile";
    if (location.startsWith("/chat")) return "chat";
    if (location === "/conversations") return "conversations";
    return "profile";
  };

  const handleTabChange = (value: string) => {
    if (value === "profile") navigate("/profile");
    if (value === "chat") navigate("/chat/general");
    if (value === "conversations") navigate("/conversations");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User size={18} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare size={18} />
            <span>Chat</span>
          </TabsTrigger>
          <TabsTrigger value="conversations" className="flex items-center gap-2">
            <MessagesSquare size={18} />
            <span>Conversations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Profile Dashboard - Coming Soon
          </div>
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Enhanced Chat - Coming Soon
          </div>
        </TabsContent>

        <TabsContent value="conversations" className="mt-4">
          <div className="text-center py-8 text-muted-foreground">
            Conversations Hub - Coming Soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
