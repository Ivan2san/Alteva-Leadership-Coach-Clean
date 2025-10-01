import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthWrapper } from "@/components/AuthWrapper";
import { flags } from "@/lib/flags";

<<<<<<< HEAD
// v1 pages
=======
// v1 pages (existing)
>>>>>>> 8dd1e24 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)
import Home from "@/pages/home";
import PromptSelection from "@/pages/prompt-selection";
import Chat from "@/pages/chat";
import KnowledgeBase from "@/pages/knowledge-base";
import Conversations from "@/pages/conversations";
import Analytics from "@/pages/analytics";
import PromptLibrary from "@/pages/prompt-library";
import Settings from "@/pages/settings";
import WelcomeGuide from "@/pages/welcome-guide";
import LGP360Report from "@/pages/lgp360-report";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import NotFound from "@/pages/not-found";
<<<<<<< HEAD
import Dashboard from "@/pages/dashboard";

// v2
import JourneyV2Router from "@/journey2/Router";
=======
import Dashboard from "@/pages/dashboard"; // your stub
>>>>>>> 8dd1e24 (feat(journey): add v2 router gate + dashboard stub; fix single listen; add free-ports script)

// v2 pages (new)
import JourneyV2Router from "@/journey2/Router";

function HomeRedirect() {
  return flags.journeyV2 ? <Redirect to="/journey" /> : <Redirect to="/dashboard" />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />

      {/* v1 (existing) */}
      {!flags.journeyV2 && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/prompts/:topic" component={PromptSelection} />
          <Route path="/chat/:topic" component={Chat} />
          <Route path="/knowledge-base" component={KnowledgeBase} />
          <Route path="/conversations" component={Conversations} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/prompt-library" component={PromptLibrary} />
          <Route path="/settings" component={Settings} />
          <Route path="/guide" component={WelcomeGuide} />
          <Route path="/lgp360" component={LGP360Report} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
        </>
      )}

      {/* v2 (new) */}
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
            <Routes />
          </div>
        </AuthWrapper>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
