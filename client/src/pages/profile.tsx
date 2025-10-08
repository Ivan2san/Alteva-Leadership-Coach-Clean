import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import { BackButton } from "@/components/back-button";
import { 
  User, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  Edit3, 
  Plus, 
  X,
  ExternalLink,
  Trash2,
  Target,
  TrendingUp,
  Info
} from "lucide-react";
import { format } from "date-fns";
import MainNavigation from "@/components/MainNavigation";

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  
  // Check if this is a first-time visit from onboarding and clear the flag
  const [showFirstTimeBanner, setShowFirstTimeBanner] = useState(() => {
    const params = new URLSearchParams(location.split('?')[1] || '');
    const isFirstTime = params.get('firstTime') === 'true';
    
    // Clear the query parameter from URL if present
    if (isFirstTime) {
      navigate('/profile', { replace: true });
    }
    
    return isFirstTime;
  });

  // State for editing
  const [editingGrowthProfile, setEditingGrowthProfile] = useState(false);
  const [leadershipStyle, setLeadershipStyle] = useState("");
  const [keyCharacteristics, setKeyCharacteristics] = useState<string[]>([]);
  const [newCharacteristic, setNewCharacteristic] = useState("");

  const [editingRedZones, setEditingRedZones] = useState(false);
  const [redZones, setRedZones] = useState<string[]>([]);
  const [newRedZone, setNewRedZone] = useState("");

  const [editingGreenZones, setEditingGreenZones] = useState(false);
  const [greenZones, setGreenZones] = useState<string[]>([]);
  const [newGreenZone, setNewGreenZone] = useState("");

  const [editingRecommendations, setEditingRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{ title: string; description: string }>>([]);
  const [newRecommendation, setNewRecommendation] = useState({ title: "", description: "" });

  // OBP State
  const [editingOBP, setEditingOBP] = useState(false);
  const [obpObjectives, setObpObjectives] = useState<Array<{ objective: string; checklist: string[] }>>([]);
  const [newObjective, setNewObjective] = useState("");
  const [editingObjectiveIndex, setEditingObjectiveIndex] = useState<number | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  // Immunity to Change State
  const [editingImmunity, setEditingImmunity] = useState(false);
  const [commitments, setCommitments] = useState<string[]>([]);
  const [competingCommitments, setCompetingCommitments] = useState<string[]>([]);
  const [experiments, setExperiments] = useState<string[]>([]);
  const [newCommitment, setNewCommitment] = useState("");
  const [newCompetingCommitment, setNewCompetingCommitment] = useState("");
  const [newExperiment, setNewExperiment] = useState("");

  // Initialize editing states when user data loads
  const initializeEditingStates = () => {
    if (user?.growthProfile && typeof user.growthProfile === 'object') {
      const profile = user.growthProfile as { leadershipStyle?: string; keyCharacteristics?: string[] };
      setLeadershipStyle(profile.leadershipStyle || "");
      setKeyCharacteristics(profile.keyCharacteristics || []);
    }
    if (Array.isArray(user?.redZones)) {
      setRedZones(user.redZones as string[]);
    }
    if (Array.isArray(user?.greenZones)) {
      setGreenZones(user.greenZones as string[]);
    }
    if (Array.isArray(user?.recommendations)) {
      setRecommendations(user.recommendations as Array<{ title: string; description: string }>);
    }
    if (Array.isArray(user?.obpData)) {
      setObpObjectives(user.obpData as Array<{ objective: string; checklist: string[] }>);
    }
    if (user?.immunityToChangeData && typeof user.immunityToChangeData === 'object') {
      const immunity = user.immunityToChangeData as { 
        commitments?: string[]; 
        competingCommitments?: string[]; 
        experiments?: string[];
      };
      setCommitments(immunity.commitments || []);
      setCompetingCommitments(immunity.competingCommitments || []);
      setExperiments(immunity.experiments || []);
    }
  };

  // Save mutations
  const saveGrowthProfileMutation = useMutation({
    mutationFn: async (data: { leadershipStyle: string; keyCharacteristics: string[] }) => {
      const response = await fetch('/api/profile/growth-profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ growthProfile: data }),
      });
      if (!response.ok) throw new Error('Failed to save growth profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingGrowthProfile(false);
      toast({ title: "Growth profile updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save growth profile.", variant: "destructive" });
    },
  });

  const saveRedZonesMutation = useMutation({
    mutationFn: async (zones: string[]) => {
      const response = await fetch('/api/profile/red-zones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ redZones: zones }),
      });
      if (!response.ok) throw new Error('Failed to save red zones');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingRedZones(false);
      toast({ title: "Red zones updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save red zones.", variant: "destructive" });
    },
  });

  const saveGreenZonesMutation = useMutation({
    mutationFn: async (zones: string[]) => {
      const response = await fetch('/api/profile/green-zones', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ greenZones: zones }),
      });
      if (!response.ok) throw new Error('Failed to save green zones');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingGreenZones(false);
      toast({ title: "Green zones updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save green zones.", variant: "destructive" });
    },
  });

  const saveRecommendationsMutation = useMutation({
    mutationFn: async (recs: Array<{ title: string; description: string }>) => {
      const response = await fetch('/api/profile/recommendations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ recommendations: recs }),
      });
      if (!response.ok) throw new Error('Failed to save recommendations');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingRecommendations(false);
      toast({ title: "Recommendations updated", description: "Your changes have been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save recommendations.", variant: "destructive" });
    },
  });

  const saveOBPMutation = useMutation({
    mutationFn: async (objectives: Array<{ objective: string; checklist: string[] }>) => {
      const response = await fetch('/api/profile/obp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ obpData: objectives }),
      });
      if (!response.ok) throw new Error('Failed to save OBP data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingOBP(false);
      toast({ title: "Objectives updated", description: "Your OBP data has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save OBP data.", variant: "destructive" });
    },
  });

  const saveImmunityMutation = useMutation({
    mutationFn: async (data: { commitments: string[]; competingCommitments: string[]; experiments: string[] }) => {
      const response = await fetch('/api/profile/immunity-to-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ immunityToChangeData: data }),
      });
      if (!response.ok) throw new Error('Failed to save Immunity to Change data');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingImmunity(false);
      toast({ title: "Immunity to Change updated", description: "Your data has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save Immunity to Change data.", variant: "destructive" });
    },
  });

  // Helper functions
  const addCharacteristic = () => {
    if (newCharacteristic.trim()) {
      setKeyCharacteristics([...keyCharacteristics, newCharacteristic.trim()]);
      setNewCharacteristic("");
    }
  };

  const removeCharacteristic = (index: number) => {
    setKeyCharacteristics(keyCharacteristics.filter((_, i) => i !== index));
  };

  const addRedZone = () => {
    if (newRedZone.trim()) {
      setRedZones([...redZones, newRedZone.trim()]);
      setNewRedZone("");
    }
  };

  const removeRedZone = (index: number) => {
    setRedZones(redZones.filter((_, i) => i !== index));
  };

  const addGreenZone = () => {
    if (newGreenZone.trim()) {
      setGreenZones([...greenZones, newGreenZone.trim()]);
      setNewGreenZone("");
    }
  };

  const removeGreenZone = (index: number) => {
    setGreenZones(greenZones.filter((_, i) => i !== index));
  };

  const addRecommendation = () => {
    if (newRecommendation.title.trim() && newRecommendation.description.trim()) {
      setRecommendations([...recommendations, newRecommendation]);
      setNewRecommendation({ title: "", description: "" });
    }
  };

  const removeRecommendation = (index: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== index));
  };

  const handleSaveGrowthProfile = () => {
    saveGrowthProfileMutation.mutate({ leadershipStyle, keyCharacteristics });
  };

  const handleSaveRedZones = () => {
    saveRedZonesMutation.mutate(redZones);
  };

  const handleSaveGreenZones = () => {
    saveGreenZonesMutation.mutate(greenZones);
  };

  const handleSaveRecommendations = () => {
    saveRecommendationsMutation.mutate(recommendations);
  };

  // OBP Helper Functions
  const addObjective = () => {
    if (newObjective.trim()) {
      setObpObjectives([...obpObjectives, { objective: newObjective.trim(), checklist: [] }]);
      setNewObjective("");
    }
  };

  const removeObjective = (index: number) => {
    setObpObjectives(obpObjectives.filter((_, i) => i !== index));
  };

  const addChecklistItem = (objectiveIndex: number) => {
    if (newChecklistItem.trim()) {
      const updated = [...obpObjectives];
      updated[objectiveIndex].checklist.push(newChecklistItem.trim());
      setObpObjectives(updated);
      setNewChecklistItem("");
    }
  };

  const removeChecklistItem = (objectiveIndex: number, checklistIndex: number) => {
    const updated = [...obpObjectives];
    updated[objectiveIndex].checklist = updated[objectiveIndex].checklist.filter((_, i) => i !== checklistIndex);
    setObpObjectives(updated);
  };

  const handleSaveOBP = () => {
    saveOBPMutation.mutate(obpObjectives);
  };

  // Immunity to Change Helper Functions
  const addCommitment = () => {
    if (newCommitment.trim()) {
      setCommitments([...commitments, newCommitment.trim()]);
      setNewCommitment("");
    }
  };

  const removeCommitment = (index: number) => {
    setCommitments(commitments.filter((_, i) => i !== index));
  };

  const addCompetingCommitment = () => {
    if (newCompetingCommitment.trim()) {
      setCompetingCommitments([...competingCommitments, newCompetingCommitment.trim()]);
      setNewCompetingCommitment("");
    }
  };

  const removeCompetingCommitment = (index: number) => {
    setCompetingCommitments(competingCommitments.filter((_, i) => i !== index));
  };

  const addExperiment = () => {
    if (newExperiment.trim()) {
      setExperiments([...experiments, newExperiment.trim()]);
      setNewExperiment("");
    }
  };

  const removeExperiment = (index: number) => {
    setExperiments(experiments.filter((_, i) => i !== index));
  };

  const handleSaveImmunity = () => {
    saveImmunityMutation.mutate({ commitments, competingCommitments, experiments });
  };

  // Parse user data
  const growthProfile = user?.growthProfile && typeof user.growthProfile === 'object' 
    ? user.growthProfile as { leadershipStyle?: string; keyCharacteristics?: string[] }
    : null;

  const userRedZones = Array.isArray(user?.redZones) ? user.redZones as string[] : [];
  const userGreenZones = Array.isArray(user?.greenZones) ? user.greenZones as string[] : [];
  const userRecommendations = Array.isArray(user?.recommendations) 
    ? user.recommendations as Array<{ title: string; description: string }>
    : [];
  
  const userOBPData = Array.isArray(user?.obpData) 
    ? user.obpData as Array<{ objective: string; checklist: string[] }>
    : [];
  
  const userImmunityData = user?.immunityToChangeData && typeof user.immunityToChangeData === 'object'
    ? user.immunityToChangeData as { commitments?: string[]; competingCommitments?: string[]; experiments?: string[] }
    : null;

  // Safely extract 360 summary - handle both string and potential JSON
  const lgp360Summary = user?.lgp360Assessment 
    ? typeof user.lgp360Assessment === 'string'
      ? user.lgp360Assessment.substring(0, 300) + (user.lgp360Assessment.length > 300 ? "..." : "")
      : String(user.lgp360Assessment).substring(0, 300) + "..."
    : null;

  const uploadDate = user?.lgp360UploadedAt 
    ? format(new Date(String(user.lgp360UploadedAt)), "MMM d, yyyy")
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="space-y-2">
            <BackButton />
            <div className="flex items-center gap-2">
              <User className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Your Profile</h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Your leadership insights, strengths, and growth areas all in one place.
            </p>
          </div>

          {/* First-time user banner */}
          {showFirstTimeBanner && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Info className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold text-primary">Welcome! Please Review Your Profile</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Take a moment to review and update your profile information across all areas below. 
                      Add your personal values, growth goals, strengths, and areas to work on. This helps 
                      your AI coach provide more personalized guidance tailored to your leadership journey.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Growth Profile Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Growth Profile
                    </CardTitle>
                    <CardDescription>Your leadership style and key characteristics</CardDescription>
                  </div>
                  <Dialog open={editingGrowthProfile} onOpenChange={(open) => {
                    setEditingGrowthProfile(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Growth Profile</DialogTitle>
                        <DialogDescription>Update your leadership style and key characteristics</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Leadership Style</Label>
                          <Input
                            value={leadershipStyle}
                            onChange={(e) => setLeadershipStyle(e.target.value)}
                            placeholder="e.g., Transformational, Servant Leader, Strategic Thinker"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Key Characteristics</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newCharacteristic}
                              onChange={(e) => setNewCharacteristic(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCharacteristic())}
                              placeholder="Add a characteristic"
                            />
                            <Button type="button" onClick={addCharacteristic}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {keyCharacteristics.map((char, index) => (
                              <Badge key={index} variant="secondary" className="gap-1">
                                {char}
                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeCharacteristic(index)} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingGrowthProfile(false)}>Cancel</Button>
                        <Button onClick={handleSaveGrowthProfile} disabled={saveGrowthProfileMutation.isPending}>
                          {saveGrowthProfileMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {growthProfile?.leadershipStyle || growthProfile?.keyCharacteristics?.length ? (
                  <div className="space-y-4">
                    {growthProfile.leadershipStyle && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Leadership Style</p>
                        <p className="font-medium">{growthProfile.leadershipStyle}</p>
                      </div>
                    )}
                    {growthProfile.keyCharacteristics && growthProfile.keyCharacteristics.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Key Characteristics</p>
                        <div className="flex flex-wrap gap-2">
                          {growthProfile.keyCharacteristics.map((char, index) => (
                            <Badge key={index} variant="secondary">{char}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Let's build your growth profile. Upload your 360 to get started.</p>
                    <Button variant="link" onClick={() => navigate("/lgp360")} className="mt-2">
                      Upload 360 Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 360 Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  360 Summary
                </CardTitle>
                <CardDescription>Your leadership assessment overview</CardDescription>
              </CardHeader>
              <CardContent>
                {lgp360Summary ? (
                  <div className="space-y-4">
                    <p className="text-sm">{lgp360Summary}</p>
                    {uploadDate && (
                      <p className="text-xs text-muted-foreground">Uploaded {uploadDate}</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => navigate("/lgp360")} className="w-full">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Full Report
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No 360 assessment uploaded yet.</p>
                    <Button variant="link" onClick={() => navigate("/lgp360")} className="mt-2">
                      Upload Now
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Red Zones Card */}
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                      Red Zones
                    </CardTitle>
                    <CardDescription>These are your Red Zones. We'll work around them, not through denial.</CardDescription>
                  </div>
                  <Dialog open={editingRedZones} onOpenChange={(open) => {
                    setEditingRedZones(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Red Zones</DialogTitle>
                        <DialogDescription>Manage your watch-outs and areas to be mindful of</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newRedZone}
                            onChange={(e) => setNewRedZone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRedZone())}
                            placeholder="Add a red zone"
                          />
                          <Button type="button" onClick={addRedZone}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {redZones.map((zone, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{zone}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeRedZone(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingRedZones(false)}>Cancel</Button>
                        <Button onClick={handleSaveRedZones} disabled={saveRedZonesMutation.isPending}>
                          {saveRedZonesMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {userRedZones.length > 0 ? (
                  <ul className="space-y-2">
                    {userRedZones.map((zone, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{zone}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No red zones identified yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Green Zones Card */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      Green Zones
                    </CardTitle>
                    <CardDescription>These are your Green Zones. Build on what works.</CardDescription>
                  </div>
                  <Dialog open={editingGreenZones} onOpenChange={(open) => {
                    setEditingGreenZones(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Green Zones</DialogTitle>
                        <DialogDescription>Manage your strengths and areas to leverage</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            value={newGreenZone}
                            onChange={(e) => setNewGreenZone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGreenZone())}
                            placeholder="Add a green zone"
                          />
                          <Button type="button" onClick={addGreenZone}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {greenZones.map((zone, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm">{zone}</span>
                              <Button variant="ghost" size="sm" onClick={() => removeGreenZone(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingGreenZones(false)}>Cancel</Button>
                        <Button onClick={handleSaveGreenZones} disabled={saveGreenZonesMutation.isPending}>
                          {saveGreenZonesMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {userGreenZones.length > 0 ? (
                  <ul className="space-y-2">
                    {userGreenZones.map((zone, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{zone}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No green zones identified yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations Card */}
            <Card className="md:col-span-2 lg:col-span-1">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Recommendations
                    </CardTitle>
                    <CardDescription>Personalized next steps for your growth</CardDescription>
                  </div>
                  <Dialog open={editingRecommendations} onOpenChange={(open) => {
                    setEditingRecommendations(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Edit Recommendations</DialogTitle>
                        <DialogDescription>Manage your growth recommendations</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Add Recommendation</Label>
                          <Input
                            value={newRecommendation.title}
                            onChange={(e) => setNewRecommendation({ ...newRecommendation, title: e.target.value })}
                            placeholder="Title"
                          />
                          <Textarea
                            value={newRecommendation.description}
                            onChange={(e) => setNewRecommendation({ ...newRecommendation, description: e.target.value })}
                            placeholder="Description"
                            rows={3}
                          />
                          <Button type="button" onClick={addRecommendation} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Recommendation
                          </Button>
                        </div>
                        <Separator />
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {recommendations.map((rec, index) => (
                            <div key={index} className="p-3 border rounded space-y-1">
                              <div className="flex items-start justify-between">
                                <p className="font-medium text-sm">{rec.title}</p>
                                <Button variant="ghost" size="sm" onClick={() => removeRecommendation(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">{rec.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingRecommendations(false)}>Cancel</Button>
                        <Button onClick={handleSaveRecommendations} disabled={saveRecommendationsMutation.isPending}>
                          {saveRecommendationsMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {userRecommendations.length > 0 ? (
                  <div className="space-y-3">
                    {userRecommendations.map((rec, index) => (
                      <div key={index} className="p-3 border rounded space-y-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No recommendations yet. I'll add some as we work together.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OBP Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      OBP: Your Objectives & Progress
                    </CardTitle>
                    <CardDescription>Track your One Big Practice with clear objectives</CardDescription>
                  </div>
                  <Dialog open={editingOBP} onOpenChange={(open) => {
                    setEditingOBP(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit OBP Objectives</DialogTitle>
                        <DialogDescription>Manage your objectives and checklists</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Add New Objective</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newObjective}
                              onChange={(e) => setNewObjective(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
                              placeholder="Enter your objective"
                            />
                            <Button type="button" onClick={addObjective}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Separator />
                        <div className="space-y-4">
                          {obpObjectives.map((obj, objIndex) => (
                            <div key={objIndex} className="p-4 border rounded space-y-3">
                              <div className="flex items-start justify-between">
                                <p className="font-medium">{obj.objective}</p>
                                <Button variant="ghost" size="sm" onClick={() => removeObjective(objIndex)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                              <div className="pl-4 space-y-2">
                                <Label className="text-sm text-muted-foreground">Checklist Items</Label>
                                {obj.checklist.map((item, itemIndex) => (
                                  <div key={itemIndex} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                    <span className="text-sm">{item}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeChecklistItem(objIndex, itemIndex)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                                <div className="flex gap-2">
                                  <Input
                                    value={editingObjectiveIndex === objIndex ? newChecklistItem : ""}
                                    onChange={(e) => {
                                      setEditingObjectiveIndex(objIndex);
                                      setNewChecklistItem(e.target.value);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addChecklistItem(objIndex);
                                        setEditingObjectiveIndex(null);
                                      }
                                    }}
                                    placeholder="Add checklist item"
                                    className="text-sm"
                                  />
                                  <Button 
                                    type="button" 
                                    size="sm" 
                                    onClick={() => {
                                      addChecklistItem(objIndex);
                                      setEditingObjectiveIndex(null);
                                    }}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingOBP(false)}>Cancel</Button>
                        <Button onClick={handleSaveOBP} disabled={saveOBPMutation.isPending}>
                          {saveOBPMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {userOBPData.length > 0 ? (
                  <div className="space-y-4">
                    {userOBPData.map((obj, index) => (
                      <div key={index} className="p-4 border rounded space-y-2">
                        <p className="font-medium">{obj.objective}</p>
                        {obj.checklist.length > 0 && (
                          <ul className="pl-4 space-y-1">
                            {obj.checklist.map((item, itemIndex) => (
                              <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No objectives set. Let's create your first one.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Immunity to Change Card */}
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Immunity to Change: What's really going on?
                    </CardTitle>
                    <CardDescription>Explore what you want to change and what might be holding you back</CardDescription>
                  </div>
                  <Dialog open={editingImmunity} onOpenChange={(open) => {
                    setEditingImmunity(open);
                    if (open) initializeEditingStates();
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Edit Immunity to Change</DialogTitle>
                        <DialogDescription>Manage your commitments, competing commitments, and experiments</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6">
                        {/* Commitments */}
                        <div className="space-y-3">
                          <Label>What I want to change</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newCommitment}
                              onChange={(e) => setNewCommitment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCommitment())}
                              placeholder="Add a commitment"
                            />
                            <Button type="button" onClick={addCommitment}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {commitments.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{item}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeCommitment(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Competing Commitments */}
                        <div className="space-y-3">
                          <Label>What might be holding me back</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newCompetingCommitment}
                              onChange={(e) => setNewCompetingCommitment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetingCommitment())}
                              placeholder="Add a competing commitment"
                            />
                            <Button type="button" onClick={addCompetingCommitment}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {competingCommitments.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{item}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeCompetingCommitment(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <Separator />

                        {/* Experiments */}
                        <div className="space-y-3">
                          <Label>Experiments to try</Label>
                          <div className="flex gap-2">
                            <Input
                              value={newExperiment}
                              onChange={(e) => setNewExperiment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExperiment())}
                              placeholder="Add an experiment"
                            />
                            <Button type="button" onClick={addExperiment}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {experiments.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{item}</span>
                                <Button variant="ghost" size="sm" onClick={() => removeExperiment(index)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingImmunity(false)}>Cancel</Button>
                        <Button onClick={handleSaveImmunity} disabled={saveImmunityMutation.isPending}>
                          {saveImmunityMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {(userImmunityData?.commitments?.length || userImmunityData?.competingCommitments?.length || userImmunityData?.experiments?.length) ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Commitments */}
                    <div className="space-y-2">
                      <p className="font-medium text-sm">What I want to change</p>
                      {userImmunityData.commitments && userImmunityData.commitments.length > 0 ? (
                        <ul className="space-y-1">
                          {userImmunityData.commitments.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No commitments yet</p>
                      )}
                    </div>

                    {/* Competing Commitments */}
                    <div className="space-y-2">
                      <p className="font-medium text-sm">What might be holding me back</p>
                      {userImmunityData.competingCommitments && userImmunityData.competingCommitments.length > 0 ? (
                        <ul className="space-y-1">
                          {userImmunityData.competingCommitments.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-orange-500 mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No competing commitments yet</p>
                      )}
                    </div>

                    {/* Experiments */}
                    <div className="space-y-2">
                      <p className="font-medium text-sm">Experiments to try</p>
                      {userImmunityData.experiments && userImmunityData.experiments.length > 0 ? (
                        <ul className="space-y-1">
                          {userImmunityData.experiments.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-green-500 mt-1">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No experiments yet</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Ready to explore what's holding you back?</p>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </main>
    </div>
  );
}
