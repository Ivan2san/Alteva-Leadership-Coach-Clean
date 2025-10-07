import React from "react";
import { Switch, Route, useLocation } from "wouter";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthWrapper } from "@/components/AuthWrapper";
import { useAuth } from "@/hooks/useAuth";

// v1 pages
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import PromptSelection from "@/pages/prompt-selection";
import Chat from "@/pages/chat";
import KnowledgeBase from "@/pages/knowledge-base";
import Conversations from "@/pages/conversations";
import Analytics from "@/pages/analytics";
import PromptLibrary from "@/pages/prompt-library";
import Settings from "@/pages/settings";
import WelcomeGuide from "@/pages/welcome-guide";
import LGP360Report from "@/pages/lgp360-report";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard"; // stub exists
import Profile from "@/pages/profile";
import PreparePage from "@/pages/prepare";

// Root route: redirects authenticated users to Profile, others to Login
function Root() {
  const [, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        navigate("/profile");
      } else {
        navigate("/login");
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  return null;
}

function AppRouter() {
  return (
    <Switch>
      {/* Root */}
      <Route path="/" component={Root} />

      {/* Common pages */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/profile" component={Profile} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/conversations/prepare" component={PreparePage} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/prompt-library" component={PromptLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path="/guide" component={WelcomeGuide} />
      <Route path="/lgp360" component={LGP360Report} />

      {/* Chat routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/prompts/:topic" component={PromptSelection} />
      <Route path="/chat/:topic" component={Chat} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthWrapper>
          <div className="min-h-screen bg-background">
            <Toaster />
            <AppRouter />
          </div>
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
