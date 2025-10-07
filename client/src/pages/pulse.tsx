import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BackButton } from "@/components/back-button";
import { Breadcrumb } from "@/components/breadcrumb";
import { Activity, TrendingUp, Star, Loader2, Users, BarChart3, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MOOD_OPTIONS = [
  { value: 1, label: "Struggling", color: "bg-red-500" },
  { value: 2, label: "Challenged", color: "bg-orange-500" },
  { value: 3, label: "Steady", color: "bg-yellow-500" },
  { value: 4, label: "Good", color: "bg-green-500" },
  { value: 5, label: "Great", color: "bg-emerald-500" },
];

const ENERGY_OPTIONS = [
  { value: 1, label: "Drained", color: "bg-gray-400" },
  { value: 2, label: "Low", color: "bg-gray-500" },
  { value: 3, label: "Moderate", color: "bg-blue-400" },
  { value: 4, label: "Good", color: "bg-blue-500" },
  { value: 5, label: "High", color: "bg-blue-600" },
];

export default function PulsePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mood, setMood] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { data: pulseHistory = [] } = useQuery({
    queryKey: ["/api/pulse-surveys"],
    queryFn: async () => {
      const res = await fetch("/api/pulse-surveys", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch pulse history");
      return res.json();
    },
  });

  const submitPulse = useMutation({
    mutationFn: async (data: { mood: number; energy: number; notes: string }) => {
      const res = await fetch("/api/pulse-surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          responses: {
            mood: data.mood,
            energy: data.energy,
          },
          notes: data.notes,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit pulse");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pulse-surveys"] });
      setMood(null);
      setEnergy(null);
      setNotes("");
      toast({
        title: "Pulse logged",
        description: "Your check-in has been saved",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not save your pulse",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (mood === null || energy === null) {
      toast({
        title: "Missing information",
        description: "Please select both mood and energy",
        variant: "destructive",
      });
      return;
    }

    submitPulse.mutate({ mood, energy, notes });
  };

  // Calculate average mood from history
  const avgMood = pulseHistory.length > 0
    ? pulseHistory.reduce((sum: number, p: any) => sum + (p.responses?.mood || 0), 0) / pulseHistory.length
    : 0;

  // Calculate average energy from history
  const avgEnergy = pulseHistory.length > 0
    ? pulseHistory.reduce((sum: number, p: any) => sum + (p.responses?.energy || 0), 0) / pulseHistory.length
    : 0;

  // Prepare chart data (reverse to show chronologically)
  const chartData = [...pulseHistory].reverse().slice(-14).map((pulse: any) => ({
    date: format(new Date(pulse.date), "MMM d"),
    mood: pulse.responses?.mood || 0,
    energy: pulse.responses?.energy || 0,
  }));

  // Calculate trend (comparing last 3 vs previous 3)
  const getTrend = (type: 'mood' | 'energy') => {
    if (pulseHistory.length < 6) return null;
    const recent = pulseHistory.slice(0, 3).reduce((sum: number, p: any) => sum + (p.responses?.[type] || 0), 0) / 3;
    const previous = pulseHistory.slice(3, 6).reduce((sum: number, p: any) => sum + (p.responses?.[type] || 0), 0) / 3;
    return recent - previous;
  };

  const moodTrend = getTrend('mood');
  const energyTrend = getTrend('energy');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <BackButton />
        <Breadcrumb items={[
          { label: "Conversations", href: "/conversations" },
          { label: "Pulse", current: true }
        ]} />

        <div className="mt-8 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">How are you doing?</h1>
            <p className="text-muted-foreground">Check in with yourself</p>
          </div>

          {/* Tabs for Personal vs Organization */}
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Personal Pulse
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Organization Pulse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-6 mt-6">

          {/* Quick Stats */}
          {pulseHistory.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Check-ins</CardDescription>
                  <CardTitle className="text-3xl">{pulseHistory.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Average Mood</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {avgMood.toFixed(1)}
                    <Star className="h-5 w-5 text-yellow-500" fill="currentColor" />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Average Energy</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {avgEnergy.toFixed(1)}
                    <Activity className="h-5 w-5 text-blue-500" />
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Mood Trend</CardDescription>
                  <CardTitle className="text-3xl flex items-center gap-2">
                    {moodTrend === null ? (
                      <span className="text-muted-foreground text-lg">-</span>
                    ) : moodTrend > 0 ? (
                      <>
                        <TrendingUp className="h-8 w-8 text-green-500" />
                        <span className="text-lg text-green-500">+{moodTrend.toFixed(1)}</span>
                      </>
                    ) : moodTrend < 0 ? (
                      <>
                        <TrendingDown className="h-8 w-8 text-red-500" />
                        <span className="text-lg text-red-500">{moodTrend.toFixed(1)}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-lg">→</span>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* Trend Chart */}
          {chartData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Pulse Trends (Last 14 Days)</CardTitle>
                <CardDescription>Track your mood and energy over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="mood" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Mood"
                      dot={{ fill: '#10b981' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="energy" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Energy"
                      dot={{ fill: '#3b82f6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Log Pulse */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/40">
                  <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Log Your Pulse</CardTitle>
                  <CardDescription className="mt-1">
                    Quick check-in on how you're feeling
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div>
                <Label className="text-base mb-3 block">How's your mood?</Label>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={mood === option.value ? "default" : "outline"}
                      className={`flex-1 ${mood === option.value ? option.color : ""}`}
                      onClick={() => setMood(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base mb-3 block">Energy level?</Label>
                <div className="flex gap-2">
                  {ENERGY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      variant={energy === option.value ? "default" : "outline"}
                      className={`flex-1 ${energy === option.value ? option.color : ""}`}
                      onClick={() => setEnergy(option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any wins or challenges today?"
                  rows={3}
                  className="mt-2"
                />
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={submitPulse.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {submitPulse.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Log Pulse"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          {pulseHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pulseHistory.slice(0, 5).map((pulse: any, index: number) => (
                    <div key={pulse.id || index} className="flex items-start justify-between p-4 rounded-lg bg-muted/50">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge className={MOOD_OPTIONS[pulse.responses?.mood - 1]?.color || "bg-gray-500"}>
                            {MOOD_OPTIONS[pulse.responses?.mood - 1]?.label || "Unknown"}
                          </Badge>
                          <Badge variant="outline">
                            Energy: {ENERGY_OPTIONS[pulse.responses?.energy - 1]?.label || "Unknown"}
                          </Badge>
                        </div>
                        {pulse.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{pulse.notes}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(pulse.date), "MMM d")}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
            </TabsContent>

            {/* Organization Pulse Tab */}
            <TabsContent value="organization" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">Organization Pulse</CardTitle>
                      <CardDescription className="mt-1">
                        Connect your organization's pulse data for team insights
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/50 rounded-lg p-8 text-center">
                    <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Integration Coming Soon</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      Connect your organization's pulse survey platform to see team trends and compare your pulse with organizational data.
                    </p>
                    <Button variant="outline" disabled>
                      Connect Integration
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Supported Platforms (Coming Soon):</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Culture Amp', 'Officevibe', 'TINYpulse', 'Custom API'].map((platform) => (
                        <div key={platform} className="p-3 border rounded-lg text-sm text-center text-muted-foreground">
                          {platform}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
