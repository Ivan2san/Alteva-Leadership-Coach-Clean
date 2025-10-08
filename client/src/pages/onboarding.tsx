import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UploadStage = 'idle' | 'uploading' | 'reading' | 'summarising' | 'confirming' | 'complete';

interface ExtractedData {
  name?: string;
  role?: string;
  personalValues?: string[];
  growthProfile?: any;
  redZones?: string[];
  greenZones?: string[];
  recommendations?: string[];
  originalContent: string;
  assessment: string;
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stage, setStage] = useState<UploadStage>('idle');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedName, setEditedName] = useState("");
  const [editedRole, setEditedRole] = useState("");
  const [editedValues, setEditedValues] = useState("");

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setStage('uploading');
      
      const formData = new FormData();
      formData.append('document', file);
      
      setStage('reading');
      
      const response = await fetch('/api/lgp360/analyze-structured', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process document');
      }
      
      setStage('summarising');
      
      return response.json();
    },
    onSuccess: (data: ExtractedData) => {
      setExtractedData(data);
      // Initialize form fields with extracted data
      setEditedName(data.name || "");
      setEditedRole(data.role || "");
      setEditedValues(data.personalValues?.join(", ") || "");
      setStage('confirming');
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process your 360 report",
        variant: "destructive",
      });
      setStage('idle');
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData) throw new Error("No data to save");
      
      // Parse edited values into an array
      const valuesArray = editedValues
        .split(',')
        .map(v => v.trim())
        .filter(v => v.length > 0);
      
      const response = await fetch('/api/lgp360', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          originalContent: extractedData.originalContent,
          assessment: extractedData.assessment,
          name: editedName || undefined,
          role: editedRole || undefined,
          personalValues: valuesArray.length > 0 ? valuesArray : extractedData.personalValues,
          growthProfile: extractedData.growthProfile,
          redZones: extractedData.redZones,
          greenZones: extractedData.greenZones,
          recommendations: extractedData.recommendations,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save report');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStage('complete');
      
      // Create checkpoint for report parsed
      fetch('/api/checkpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          userId: 'current', // Will be set by server
          type: 'report_parsed',
        }),
      }).catch(console.error);
      
      toast({
        title: "Welcome aboard!",
        description: "Your 360 report is ready. Let's explore your profile.",
      });
      
      setTimeout(() => {
        setLocation('/profile');
      }, 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, Word document, or text file.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleUseSample = () => {
    // TODO: Implement sample report
    toast({
      title: "Sample report",
      description: "Sample report feature coming soon!",
    });
  };

  const handleConfirm = () => {
    saveMutation.mutate();
  };

  const getProgress = () => {
    switch (stage) {
      case 'idle': return 0;
      case 'uploading': return 33;
      case 'reading': return 66;
      case 'summarising': return 90;
      case 'confirming': return 100;
      case 'complete': return 100;
      default: return 0;
    }
  };

  const getStageLabel = () => {
    switch (stage) {
      case 'uploading': return 'Uploading';
      case 'reading': return 'Reading';
      case 'summarising': return 'Summarising';
      default: return '';
    }
  };

  if (stage === 'complete') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="text-green-600 dark:text-green-400" size={32} />
            </div>
            <CardTitle className="text-2xl">All set!</CardTitle>
            <CardDescription>
              Taking you to your profile...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (stage === 'confirming' && extractedData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Confirm your details</CardTitle>
            <CardDescription>
              I've read your 360 report. Here's what I found. Tweak anything that looks off.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Your Role</Label>
                <Input
                  id="role"
                  value={editedRole}
                  onChange={(e) => setEditedRole(e.target.value)}
                  placeholder="Senior Manager"
                />
              </div>
              
              <div>
                <Label htmlFor="values">Your Values</Label>
                <Input
                  id="values"
                  value={editedValues}
                  onChange={(e) => setEditedValues(e.target.value)}
                  placeholder="Integrity, Teamwork, Innovation"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Separate with commas
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  360 Summary Preview
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {extractedData.assessment.substring(0, 200)}...
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStage('idle')}
                className="flex-1"
              >
                Start Over
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={saveMutation.isPending}
                className="flex-1"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Looks good!'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === 'uploading' || stage === 'reading' || stage === 'summarising') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Processing your 360...</CardTitle>
            <CardDescription>{getStageLabel()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Progress value={getProgress()} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Uploading</span>
                <span>Reading</span>
                <span>Summarising</span>
              </div>
            </div>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary rounded-md flex items-center justify-center mb-4">
            <Sparkles className="text-primary-foreground" size={24} />
          </div>
          <CardTitle className="text-2xl">Upload your 360</CardTitle>
          <CardDescription>
            I'll read it and pull out the good stuff.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
               onClick={() => fileInputRef.current?.click()}>
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, Word (.docx), CSV, or text files
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.csv"
              onChange={handleFileUpload}
            />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleUseSample}
          >
            <FileText className="mr-2 h-4 w-4" />
            Use a sample report
          </Button>

          <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold mb-1">Your report and chats are private to you. Full stop.</p>
            <p>We take your privacy seriously. Your data is encrypted and never shared.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
