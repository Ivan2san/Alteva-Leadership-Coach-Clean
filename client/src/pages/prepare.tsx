import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Breadcrumb } from "@/components/breadcrumb";
import { ChevronLeft, ChevronRight, Target, Users, MessageSquare, AlertTriangle, CheckSquare, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";

type WizardStep = "goal" | "stakeholders" | "keyPoints" | "blockers" | "actions" | "review";

interface PrepareData {
  title: string;
  goal: string;
  stakeholders: string[];
  keyPoints: string[];
  blockers: string[];
  actions: string[];
}

interface Brief {
  id: string;
  title: string;
  brief: string;
  checklist: { item: string; completed: boolean }[];
  createdAt: string;
}

export default function PreparePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<WizardStep>("goal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<Brief | null>(null);
  
  const [data, setData] = useState<PrepareData>({
    title: "",
    goal: "",
    stakeholders: [],
    keyPoints: [],
    blockers: [],
    actions: [],
  });
  
  const [currentInput, setCurrentInput] = useState("");

  const steps: WizardStep[] = ["goal", "stakeholders", "keyPoints", "blockers", "actions", "review"];
  const currentStepIndex = steps.indexOf(currentStep);

  const stepConfig = {
    goal: {
      title: "What's the conversation about?",
      description: "Set your main goal for this conversation",
      icon: Target,
      placeholder: "e.g., Discuss team restructuring with my manager",
    },
    stakeholders: {
      title: "Who's involved?",
      description: "List the people in this conversation",
      icon: Users,
      placeholder: "e.g., Sarah (my manager), Tom (team lead)",
    },
    keyPoints: {
      title: "What do you need to cover?",
      description: "Key points you want to make",
      icon: MessageSquare,
      placeholder: "e.g., Need more resources for Q2 project",
    },
    blockers: {
      title: "What might get in the way?",
      description: "Anticipate likely obstacles",
      icon: AlertTriangle,
      placeholder: "e.g., Budget constraints already flagged",
    },
    actions: {
      title: "What happens next?",
      description: "Follow-up actions you want to agree on",
      icon: CheckSquare,
      placeholder: "e.g., Schedule follow-up meeting next week",
    },
    review: {
      title: "Ready to generate your brief?",
      description: "Review your inputs, then we'll create your one-page brief",
      icon: Target,
      placeholder: "",
    },
  };

  const handleAddItem = () => {
    if (currentInput.trim() && currentStep !== "goal" && currentStep !== "review") {
      const key = currentStep as keyof Omit<PrepareData, "title" | "goal">;
      setData(prev => ({
        ...prev,
        [key]: [...prev[key], currentInput.trim()]
      }));
      setCurrentInput("");
    }
  };

  const handleRemoveItem = (step: keyof PrepareData, index: number) => {
    if (Array.isArray(data[step])) {
      setData(prev => ({
        ...prev,
        [step]: (prev[step] as string[]).filter((_, i) => i !== index)
      }));
    }
  };

  const handleNext = () => {
    if (currentStep === "goal") {
      if (!data.title.trim() || !data.goal.trim()) {
        toast({
          title: "Missing information",
          description: "Please provide a title and goal",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
      setCurrentInput("");
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
      setCurrentInput("");
    }
  };

  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/prepare-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to generate brief");

      const brief = await response.json();
      setGeneratedBrief(brief);
      
      toast({
        title: "Brief generated!",
        description: "Your conversation prep is ready",
      });
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Could not create your brief. Try again?",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!generatedBrief) return;

    const content = `
${generatedBrief.title}
${"=".repeat(generatedBrief.title.length)}

${generatedBrief.brief}

CHECKLIST
---------
${generatedBrief.checklist.map(item => `☐ ${item.item}`).join("\n")}

Generated: ${new Date(generatedBrief.createdAt).toLocaleDateString()}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${generatedBrief.title.replace(/\s+/g, "-").toLowerCase()}-brief.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Exported!",
      description: "Your brief has been downloaded",
    });
  };

  if (generatedBrief) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MainNavigation />
        
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb items={[
          { label: "Conversations", href: "/conversations" },
          { label: "Prepare", current: true }
        ]} />

        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{generatedBrief.title}</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Created {new Date(generatedBrief.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => navigate("/conversations")}>
                Done
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                {generatedBrief.brief}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist</CardTitle>
              <CardDescription>Keep track as you go</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {generatedBrief.checklist.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                    <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <span>{item.item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    );
  }

  const StepIcon = stepConfig[currentStep].icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Breadcrumb items={[
        { label: "Conversations", href: "/conversations" },
        { label: "Prepare", current: true }
      ]} />

      <div className="mt-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% complete
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <StepIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">{stepConfig[currentStep].title}</CardTitle>
                <CardDescription className="text-base mt-1">
                  {stepConfig[currentStep].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === "goal" && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Give this prep a name</Label>
                  <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Q2 Planning with Sarah"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="goal">What's your main goal?</Label>
                  <Textarea
                    id="goal"
                    value={data.goal}
                    onChange={(e) => setData(prev => ({ ...prev, goal: e.target.value }))}
                    placeholder={stepConfig.goal.placeholder}
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>
            )}

            {currentStep === "review" && (
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Goal</h3>
                  <p className="text-gray-700 dark:text-gray-300">{data.goal}</p>
                </div>
                {data.stakeholders.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Stakeholders</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                      {data.stakeholders.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {data.keyPoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Key Points</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                      {data.keyPoints.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </div>
                )}
                {data.blockers.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Potential Blockers</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                      {data.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}
                {data.actions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Follow-up Actions</h3>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                      {data.actions.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {currentStep !== "goal" && currentStep !== "review" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    placeholder={stepConfig[currentStep].placeholder}
                    onKeyPress={(e) => e.key === "Enter" && handleAddItem()}
                  />
                  <Button onClick={handleAddItem} type="button">Add</Button>
                </div>

                {data[currentStep].length > 0 && (
                  <div className="space-y-2">
                    {data[currentStep].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                        <span>{item}</span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveItem(currentStep, index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {currentStep === "review" ? (
                <Button onClick={handleGenerateBrief} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate Brief"
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
