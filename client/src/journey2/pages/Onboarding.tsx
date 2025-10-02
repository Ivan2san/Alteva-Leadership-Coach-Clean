import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, BarChart, Calendar, Library, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
  "Leadership",
  "Communication",
  "Strategic Thinking",
  "Team Development",
  "Personal Growth",
  "Other",
];

type GoalFormData = {
  title: string;
  category: string;
  targetDate: string;
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isChecking, setIsChecking] = useState(true);
  const [goalFormData, setGoalFormData] = useState<GoalFormData>({
    title: "",
    category: "",
    targetDate: "",
  });

  useEffect(() => {
    const completed = localStorage.getItem("journey2-onboarding-completed");
    if (completed === "true") {
      setLocation("/journey/overview");
    } else {
      setIsChecking(false);
    }
  }, [setLocation]);

  const createGoalMutation = useMutation({
    mutationFn: async (data: GoalFormData) => {
      const payload = {
        title: data.title,
        description: "",
        category: data.category || null,
        status: "active",
        progress: 0,
        targetDate: data.targetDate || null,
      };
      const res = await apiRequest("POST", "/api/journey/goals", payload);
      return res.json();
    },
    onSuccess: () => {
      setCurrentStep(4);
    },
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipGoal = () => {
    setCurrentStep(4);
  };

  const handleCreateGoal = () => {
    if (goalFormData.title.trim()) {
      createGoalMutation.mutate(goalFormData);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("journey2-onboarding-completed", "true");
    setLocation("/journey/overview");
  };

  if (isChecking) {
    return null;
  }

  const progressPercentage = (currentStep / 4) * 100;

  const features = [
    {
      icon: Target,
      title: "Goals",
      description: "Set and track your leadership objectives",
      color: "text-blue-600",
    },
    {
      icon: CheckCircle,
      title: "Check-ins",
      description: "Daily mood and reflection tracking",
      color: "text-green-600",
    },
    {
      icon: BarChart,
      title: "Insights",
      description: "Analytics and progress visualization",
      color: "text-purple-600",
    },
    {
      icon: Calendar,
      title: "Plan",
      description: "Create development timelines with milestones",
      color: "text-orange-600",
    },
    {
      icon: Library,
      title: "Library",
      description: "Access coaching resources",
      color: "text-pink-600",
    },
  ];

  return (
    <Shell>
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of 4
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 1 && (
              <Card className="border-2">
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
                      <Sparkles className="h-12 w-12 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-4xl mb-2">Welcome to Journey 2!</CardTitle>
                  <CardDescription className="text-lg">
                    Your personalized leadership development platform
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <p className="text-center text-gray-700 mb-6">
                      Journey 2 helps you become a better leader through:
                    </p>
                    <div className="grid gap-3">
                      <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Target className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Track your leadership goals</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Daily check-ins and reflections</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                        <BarChart className="h-5 w-5 text-purple-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Insights and progress analytics</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                        <Calendar className="h-5 w-5 text-orange-600 flex-shrink-0" />
                        <span className="text-sm font-medium">Development plans with milestones</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end pt-6">
                  <Button onClick={handleNext} size="lg" className="gap-2">
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {currentStep === 2 && (
              <Card className="border-2">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl">Explore Journey 2 Features</CardTitle>
                  <CardDescription className="text-base">
                    Everything you need for your leadership development journey
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-4">
                    {features.map((feature, index) => (
                      <motion.div
                        key={feature.title}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4 p-4 border rounded-lg hover:border-gray-400 transition-colors"
                      >
                        <div className={`p-3 rounded-lg bg-gray-50 ${feature.color}`}>
                          <feature.icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-6">
                  <Button onClick={handlePrevious} variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button onClick={handleNext} className="gap-2">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            )}

            {currentStep === 3 && (
              <Card className="border-2">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl">Create Your First Goal</CardTitle>
                  <CardDescription className="text-base">
                    Set your first leadership goal to get started (optional)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="goal-title">
                        Goal Title <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="goal-title"
                        placeholder="e.g., Improve team communication"
                        value={goalFormData.title}
                        onChange={(e) =>
                          setGoalFormData({ ...goalFormData, title: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goal-category">Category</Label>
                      <select
                        id="goal-category"
                        value={goalFormData.category}
                        onChange={(e) =>
                          setGoalFormData({ ...goalFormData, category: e.target.value })
                        }
                        className="w-full border rounded-md px-3 py-2 bg-white"
                      >
                        <option value="">Select a category (optional)</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goal-target-date">Target Date</Label>
                      <Input
                        id="goal-target-date"
                        type="date"
                        value={goalFormData.targetDate}
                        onChange={(e) =>
                          setGoalFormData({ ...goalFormData, targetDate: e.target.value })
                        }
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Tip:</strong> Start with a specific, achievable goal. You can always
                        add more goals later from the Goals page.
                      </p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-6">
                  <Button onClick={handlePrevious} variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex gap-2">
                    <Button onClick={handleSkipGoal} variant="ghost">
                      Skip
                    </Button>
                    <Button
                      onClick={handleCreateGoal}
                      disabled={!goalFormData.title.trim() || createGoalMutation.isPending}
                      className="gap-2"
                    >
                      {createGoalMutation.isPending ? (
                        "Creating..."
                      ) : (
                        <>
                          Create Goal
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}

            {currentStep === 4 && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-blue-50">
                  <CardHeader className="text-center pb-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className="flex justify-center mb-4"
                    >
                      <div className="p-4 bg-gradient-to-br from-green-500 to-blue-600 rounded-full">
                        <CheckCircle className="h-16 w-16 text-white" />
                      </div>
                    </motion.div>
                    <CardTitle className="text-4xl mb-2">You're All Set! 🎉</CardTitle>
                    <CardDescription className="text-lg">
                      Start your leadership journey today
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-4 text-center">
                      <p className="text-gray-700">
                        You've completed the onboarding process and you're ready to begin your
                        leadership development journey with Journey 2.
                      </p>
                      <div className="bg-white/80 backdrop-blur rounded-lg p-6 space-y-3">
                        <h3 className="font-semibold text-lg mb-3">Next Steps:</h3>
                        <div className="text-left space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            <span className="text-sm">Visit your Overview dashboard</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            <span className="text-sm">Complete your first daily check-in</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            <span className="text-sm">
                              {goalFormData.title ? "Track your goal progress" : "Create your first goal"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-600" />
                            <span className="text-sm">Explore the coaching library</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-center pt-6">
                    <Button onClick={handleComplete} size="lg" className="gap-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
                      Go to Overview
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>

        {currentStep < 4 && (
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={handleComplete}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip onboarding
            </Button>
          </div>
        )}
      </div>
    </Shell>
  );
}
