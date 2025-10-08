import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { lgp360ReportSchema, type LGP360ReportData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import { FileText, Save, CheckCircle2, Upload, FileCheck, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function LGP360ReportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  // Fetch existing LGP360 data
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/auth/me"]
  });

  const userDataTyped = userData as { user?: { 
    lgp360Assessment?: string;
    lgp360OriginalContent?: string;
    lgp360UploadedAt?: string; 
  } } | undefined;
  
  const hasExistingReport = !!userDataTyped?.user?.lgp360Assessment;

  const form = useForm<LGP360ReportData>({
    resolver: zodResolver(lgp360ReportSchema),
    defaultValues: {
      originalContent: userDataTyped?.user?.lgp360OriginalContent || "",
      assessment: userDataTyped?.user?.lgp360Assessment || "",
    },
  });

  const watchedAssessment = form.watch("assessment");

  const saveMutation = useMutation({
    mutationFn: async (data: LGP360ReportData) => {
      await apiRequest("POST", "/api/lgp360", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "LGP360 Assessment Saved",
        description: "Your professional leadership assessment has been updated and will enhance your coaching experience.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save your LGP360 assessment",
        variant: "destructive",
      });
    },
  });

  // AI Document Processing Mutation
  const processDocumentMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/lgp360/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to process document');
      }
      
      return response.json();
    },
    onSuccess: (data: { originalContent: string; assessment: string }) => {
      // Auto-populate form with AI-generated data
      form.setValue("originalContent", data.originalContent);
      form.setValue("assessment", data.assessment);
      toast({
        title: "Professional Assessment Complete",
        description: "AI has created a comprehensive professional coaching assessment. Review and save when ready.",
      });
      setIsProcessingUpload(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Document Processing Failed",
        description: error.message || "Failed to process the uploaded document",
        variant: "destructive",
      });
      setIsProcessingUpload(false);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Prevent duplicate processing if already in progress
    if (isProcessingUpload || processDocumentMutation.isPending) {
      return;
    }

    // Check file type (note: only .docx is supported, not legacy .doc)
    const allowedTypes = ['application/pdf', 'text/plain', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, Word (.docx), CSV, or text file.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingUpload(true);
    processDocumentMutation.mutate(file);
    
    // Clear the input to allow re-uploading the same file
    event.target.value = '';
  };

  const onSubmit = (data: LGP360ReportData) => {
    saveMutation.mutate(data);
  };

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <MainNavigation />
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">

          {/* Header */}
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-primary to-accent rounded-xl flex items-center justify-center mb-4">
                <FileText className="text-white" size={32} />
              </div>
              <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {hasExistingReport ? "Update Your LGP360 Assessment" : "Complete Your LGP360 Assessment"}
              </CardTitle>
              <CardDescription className="text-base leading-relaxed">
                {hasExistingReport 
                  ? "Upload a new document or edit your professional coaching assessment to ensure the AI coach provides the most personalized guidance."
                  : "Upload your leadership assessment document and let AI create a comprehensive professional coaching assessment using Alteva methodology."
                }
              </CardDescription>
            </CardHeader>
          </Card>

          {hasExistingReport && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your LGP360 assessment was last updated on {userDataTyped?.user?.lgp360UploadedAt ? new Date(userDataTyped.user.lgp360UploadedAt).toLocaleDateString() : 'recently'}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Document Upload */}
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Upload className="h-5 w-5" />
                Professional Document Analysis
              </CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-300">
                Upload your LGP360 report, 360-degree feedback, or leadership assessment. AI will create a comprehensive professional coaching assessment using Alteva Growth-Edge Leadership methodology.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div 
                  className="border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                  onClick={() => !isProcessingUpload && !processDocumentMutation.isPending && fileInputRef.current?.click()}
                >
                  {isProcessingUpload ? (
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
                      <div>
                        <p className="font-medium text-blue-700 dark:text-blue-300">
                          AI is creating professional assessment...
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Applying Alteva coaching methodology and analysis
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <FileCheck className="h-12 w-12 text-blue-500" />
                      <div>
                        <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
                          Click to upload your leadership document
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                          Supports PDF, Word, and text files (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="file-upload-input"
                />
                
                <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
                  Your document will be processed securely and deleted after analysis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Coaching Assessment */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Coaching Assessment</CardTitle>
                  <CardDescription>
                    {watchedAssessment 
                      ? "Review your AI-generated professional coaching assessment and save when ready."
                      : "Upload a document above to generate your professional coaching assessment using Alteva methodology."
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {watchedAssessment && (
                    <div className="border rounded-lg p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
                      <h3 className="font-semibold text-lg mb-4 text-amber-800 dark:text-amber-200">Your Professional Leadership Assessment</h3>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{watchedAssessment}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="assessment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Professional Coaching Assessment</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Your professional coaching assessment will appear here after document upload..."
                            className="min-h-[200px] resize-y"
                            {...field}
                            data-testid="textarea-assessment"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={saveMutation.isPending || !watchedAssessment}
                      className="flex-1"
                      data-testid="button-save-assessment"
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Professional Assessment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}