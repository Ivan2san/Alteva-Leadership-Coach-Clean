import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { ArrowRight, BookOpen, Target, Brain, Heart, MessageSquare, TrendingUp } from "lucide-react";
import Header from "@/components/header";
import { BackButton } from "@/components/back-button";

interface WelcomeGuideProps {
  isWelcomeFlow?: boolean;
  onContinue?: () => void;
}

// Main component that can be used as route or standalone
function WelcomeGuideContent({ isWelcomeFlow = false, onContinue }: WelcomeGuideProps) {
  const [, setLocation] = useLocation();

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      setLocation("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isWelcomeFlow && <Header />}
      
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="space-y-6">
          {!isWelcomeFlow && (
            <div className="space-y-2">
              <BackButton />
            </div>
          )}

          {/* Welcome Header */}
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="text-white" size={32} />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Welcome to Your Alteva Coach Companion
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                A real-time, always-available digital coach that's here to help you grow from the inside out. 
                This isn't content delivery or program admin—it's a trained reflection partner built to stretch, 
                centre, and support your leadership journey.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* What It's Here For */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                What It's Here For
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Coach Companion helps you integrate and embody everything you're learning with Alteva—especially the hard parts:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Owning your impact</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Holding tension with grace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Shifting from reactive habits to conscious leadership</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Building a culture where performance, learning, and trust thrive (the Triple Goal)</span>
                </li>
              </ul>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-3">It's your personal tool to:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Check in daily on your growth edge, triggers, and values</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Practice new mindsets and behaviours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Rehearse difficult conversations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Get back to centre when you're thrown off</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-accent">•</span>
                    <span>Stay accountable to your One Big Practice (OBP)</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                It mirrors, it prompts, it challenges. It won't sugarcoat. It won't rescue. It meets you where you are, 
                with emotionally intelligent, precise, human support. Always in service of:
              </p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">Great Performance</h4>
                    <p className="text-xs text-muted-foreground">Clearer standards, sharper focus</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">Great Learning</h4>
                    <p className="text-xs text-muted-foreground">Deeper awareness, better feedback</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Heart className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm">Great Workplace</h4>
                    <p className="text-xs text-muted-foreground">More trust, honesty, and connection</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* What It's Trained In */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                What It's Trained In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                The Coach Companion is built from the ground up on the full Alteva system, including:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Vertical Growth Development</strong> (not just skills, but identity shifts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Red Zone / Green Zone Coaching</strong> (moving from reactive to connected)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>One Big Practice (OBP) Integration</strong> (daily behavioural embedding)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>O.O.R.A. Conversation Support</strong> (Ownership, Observations, Requests, Agreements)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Accountable Conversations</strong> and Culture Practices</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Peak Performance Science</strong> from Flow Research Collective</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Values Embodiment</strong> (not just knowing your values, living them)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span><strong>Self-Regulation and Shadow Work</strong> Tools</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* It's Not Here To */}
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-700 dark:text-orange-400">It's Not Here To...</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-orange-600 dark:text-orange-300">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Give generic leadership advice</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Do your reflection for you</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>Replace people who support you or team conversations</span>
                </li>
              </ul>
              <p className="text-sm text-orange-600 dark:text-orange-300 mt-4 leading-relaxed">
                It's here to deepen them. It's a coach in your pocket, not a guru. And like any great coach, 
                it will only go as deep as you let it.
              </p>
            </CardContent>
          </Card>

          {/* Reflection & Practice Prompts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Reflection & Practice Prompts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Prompts don't come in a list—you don't scroll, you show up. You tell the Coach Companion what you're facing 
                ("I'm stuck," "I've got a hard convo," "Just checking in"), and it responds in real time with what you need most.
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Example Daily Check-ins:</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>• "Where did I act from safety instead of growth today?"</li>
                  <li>• "What would my OBP look like if I really embodied it today?"</li>
                  <li>• "What story did I tell myself today that limited me?"</li>
                  <li>• "What did I learn about myself today—honestly?"</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Final Message */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="font-semibold text-primary">Final Thought</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  If you're willing to bring honesty, presence, and curiosity—this tool will become a game-changer. 
                  Not because it tells you what to do, but because it helps you hear what your own leadership is asking of you next.
                </p>
                <p className="text-sm font-medium text-primary">
                  Welcome in. Let's work.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Continue Button */}
          <div className="pt-4">
            <Button 
              onClick={handleContinue}
              className="w-full"
              data-testid="button-continue-to-app"
            >
              {isWelcomeFlow ? "Continue to Your Coach" : "Back to App"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

// Route component wrapper
export default function WelcomeGuide() {
  const [location, setLocation] = useLocation();
  const isOnboarding = location.includes('onboarding=true');
  const isWelcomeFlow = location.includes('welcome=true') || isOnboarding;
  
  const handleOnboardingContinue = () => {
    // After welcome guide in onboarding, go to profile for review
    setLocation("/profile?firstTime=true");
  };
  
  return (
    <WelcomeGuideContent 
      isWelcomeFlow={isWelcomeFlow} 
      onContinue={isOnboarding ? handleOnboardingContinue : undefined}
    />
  );
}

// Export the content component for potential reuse
export { WelcomeGuideContent };