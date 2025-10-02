import React from "react";
import { Switch, Route, useLocation } from "wouter";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthWrapper } from "@/components/AuthWrapper";

import { flags } from "@/lib/flags";

// v1 pages (existing)
import Home from "@/pages/home";
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
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard"; // stub exists

// v2 router
import JourneyV2Router from "@/journey2/Router";

// When journeyV2 is ON, push "/" -> "/journey"
function JumpToJourney() {
  const [, navigate] = useLocation();
  React.useEffect(() => {
    navigate("/journey");
  }, [navigate]);
  return null;
}

// Root route: v1 shows Home, v2 jumps to /journey
function Root() {
  return flags.journeyV2 ? <JumpToJourney /> : <Home />;
}

function AppRouter() {
  return (
    <Switch>
      {/* Root */}
      <Route path="/" component={Root} />

      {/* Common pages */}
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/knowledge-base" component={KnowledgeBase} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/prompt-library" component={PromptLibrary} />
      <Route path="/settings" component={Settings} />
      <Route path="/guide" component={WelcomeGuide} />
      <Route path="/lgp360" component={LGP360Report} />

      {/* v1-only routes */}
      {!flags.journeyV2 && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/prompts/:topic" component={PromptSelection} />
          <Route path="/chat/:topic" component={Chat} />
        </>
      )}

      {/* v2 (captures /journey/**) */}
      {flags.journeyV2 && <Route path="/journey/:rest*" component={JourneyV2Router} />}

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
