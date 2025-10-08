import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  User, 
  MessageSquare, 
  Shield, 
  Database,
  Users,
  BarChart3,
  FileText,
  Bell,
  Lock,
  Download,
  Trash2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";

export default function SettingsPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // User preferences state
  const [notifications, setNotifications] = useState(true);
  const [chatHistory, setChatHistory] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const UserSettings = () => (
    <div className="space-y-6">
      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              defaultValue={user?.fullName || ""}
              data-testid="input-fullname"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              defaultValue={user?.email || ""}
              disabled
              className="bg-muted"
              data-testid="input-email"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Chat Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat Preferences
          </CardTitle>
          <CardDescription>
            Customize your chat experience and AI interactions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Save Chat History</Label>
              <p className="text-sm text-muted-foreground">
                Store your conversations for future reference
              </p>
            </div>
            <Switch
              checked={chatHistory}
              onCheckedChange={setChatHistory}
              data-testid="switch-chat-history"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about coaching reminders and updates
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              data-testid="switch-notifications"
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Private Mode</Label>
              <p className="text-sm text-muted-foreground">
                Enhanced privacy for sensitive conversations
              </p>
            </div>
            <Switch
              checked={privateMode}
              onCheckedChange={setPrivateMode}
              data-testid="switch-private-mode"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Data & Privacy
          </CardTitle>
          <CardDescription>
            Manage your data and privacy preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full justify-start" data-testid="button-export-data">
            <Download className="mr-2 h-4 w-4" />
            Export My Data
          </Button>
          <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" data-testid="button-delete-conversations">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete All Conversations
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const AdminSettings = () => (
    <Tabs defaultValue="users" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
        <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
        <TabsTrigger value="content" data-testid="tab-content">Content</TabsTrigger>
        <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="users" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold">47</div>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">12</div>
                <p className="text-sm text-muted-foreground">Active Today</p>
              </Card>
            </div>
            <Button className="w-full" data-testid="button-manage-users">
              Manage All Users
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="system" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              System Configuration
            </CardTitle>
            <CardDescription>
              Configure system-wide settings and security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">OpenAI API Configuration</Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                data-testid="input-api-key"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>User Registration</Label>
                <p className="text-sm text-muted-foreground">
                  Allow new users to create accounts
                </p>
              </div>
              <Switch defaultChecked data-testid="switch-registration" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Maintenance Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Temporarily disable the application
                </p>
              </div>
              <Switch data-testid="switch-maintenance" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="content" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Content Management
            </CardTitle>
            <CardDescription>
              Manage prompts, knowledge base, and AI content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-prompts">
              <FileText className="mr-2 h-4 w-4" />
              Manage Prompt Library
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-knowledge">
              <Database className="mr-2 h-4 w-4" />
              Manage Knowledge Base
            </Button>
            <Button variant="outline" className="w-full justify-start" data-testid="button-ai-settings">
              <SettingsIcon className="mr-2 h-4 w-4" />
              AI Model Settings
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Analytics Overview
            </CardTitle>
            <CardDescription>
              System usage and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold">1,247</div>
                <p className="text-sm text-muted-foreground">Total Chats</p>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold">89%</div>
                <p className="text-sm text-muted-foreground">User Satisfaction</p>
              </Card>
            </div>
            <Button variant="outline" className="w-full" data-testid="button-detailed-analytics">
              View Detailed Analytics
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Settings</h1>
              {isAdmin && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {isAdmin 
                ? "Manage system configuration and user settings" 
                : "Customize your coaching experience and preferences"
              }
            </p>
          </div>

          {isAdmin ? <AdminSettings /> : <UserSettings />}

          <div className="pt-4">
            <Button 
              onClick={handleSaveSettings} 
              disabled={isLoading}
              className="w-full"
              data-testid="button-save-settings"
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}