import React from "react";
import { Route, Switch, Redirect } from "wouter";
import Shell from "./components/Shell";
import Overview from "./pages/Overview";
import Onboarding from "./pages/Onboarding";
import Goals from "./pages/Goals";
import DailyCheckIn from "./pages/DailyCheckIn";
import Insights from "./pages/Insights";
import Library from "./pages/Library";

export default function JourneyV2Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/journey" component={() => <Redirect to="/journey/overview" />} />
        <Route path="/journey/overview" component={Overview} />
        <Route path="/journey/onboarding" component={Onboarding} />
        <Route path="/journey/goals" component={Goals} />
        <Route path="/journey/check-in" component={DailyCheckIn} />
        <Route path="/journey/insights" component={Insights} />
        <Route path="/journey/library" component={Library} />
        <Route>Not found</Route>
      </Switch>
    </Shell>
  );
}
