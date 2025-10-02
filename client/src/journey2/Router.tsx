import React from "react";
import { Router as WouterRouter, Switch, Route, Redirect } from "wouter";

import Overview from "@/journey2/pages/Overview";
import Goals from "@/journey2/pages/Goals";
import Plan from "@/journey2/pages/Plan";
import CheckIns from "@/journey2/pages/CheckIns";
import DailyCheckIn from "@/journey2/pages/DailyCheckIn";
import Insights from "@/journey2/pages/Insights";
import Library from "@/journey2/pages/Library";
import Onboarding from "@/journey2/pages/Onboarding";

export default function JourneyV2Router() {
  return (
    <WouterRouter base="/journey">
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/goals" component={Goals} />
        <Route path="/plan" component={Plan} />
        <Route path="/check-ins" component={CheckIns} />
        <Route path="/daily" component={DailyCheckIn} />
        <Route path="/insights" component={Insights} />
        <Route path="/library" component={Library} />
        <Route path="/onboarding" component={Onboarding} />
        {/* fallback */}
        <Route><Redirect to="/" /></Route>
      </Switch>
    </WouterRouter>
  );
}
