import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, Activity } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { Breadcrumb } from "@/components/breadcrumb";
import { useLocation } from "wouter";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";

export default function ConversationsPage() {
  const [, navigate] = useLocation();
  const tools = [
    {
      id: 'prepare',
      icon: Target,
      title: 'Prepare',
      description: 'Plan your conversation. Set goals, identify stakeholders, anticipate challenges.',
      buttonText: 'Start Preparing',
      colorClasses: {
        bg: 'bg-blue-50 dark:bg-blue-950/20',
        border: 'border-blue-200 dark:border-blue-800',
        iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        iconText: 'text-blue-600 dark:text-blue-400',
        buttonBg: 'bg-blue-600 hover:bg-blue-700',
      },
      route: '/conversations/prepare',
    },
    {
      id: 'role-play',
      icon: Users,
      title: 'Role Play',
      description: "Practice the conversation. I'll be your difficult stakeholder.",
      buttonText: 'Ready to practise?',
      colorClasses: {
        bg: 'bg-purple-50 dark:bg-purple-950/20',
        border: 'border-purple-200 dark:border-purple-800',
        iconBg: 'bg-purple-100 dark:bg-purple-900/40',
        iconText: 'text-purple-600 dark:text-purple-400',
        buttonBg: 'bg-purple-600 hover:bg-purple-700',
      },
      route: '/conversations/role-play',
    },
    {
      id: 'pulse',
      icon: Activity,
      title: 'Pulse',
      description: 'Track your progress. See trends, celebrate wins.',
      buttonText: 'Check Pulse',
      colorClasses: {
        bg: 'bg-green-50 dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800',
        iconBg: 'bg-green-100 dark:bg-green-900/40',
        iconText: 'text-green-600 dark:text-green-400',
        buttonBg: 'bg-green-600 hover:bg-green-700',
      },
      route: '/conversations/pulse',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <BackButton />
        <Breadcrumb items={[{ label: "Conversations", current: true }]} />
      
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold mb-3">Conversation Tools</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Choose your tool
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          
          return (
            <Card 
              key={tool.id} 
              className={`${tool.colorClasses.bg} border-2 ${tool.colorClasses.border} hover:shadow-xl transition-all duration-200 hover:-translate-y-1`}
            >
              <CardHeader className="text-center pb-4">
                <div className="flex justify-center mb-4">
                  <div className={`p-4 rounded-2xl ${tool.colorClasses.iconBg}`}>
                    <IconComponent className={`h-10 w-10 ${tool.colorClasses.iconText}`} />
                  </div>
                </div>
                <CardTitle className="text-2xl mb-2">{tool.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className={`w-full ${tool.colorClasses.buttonBg} text-white font-medium py-6 text-base`}
                  onClick={() => navigate(tool.route)}
                >
                  {tool.buttonText}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      </div>
    </div>
  );
}
