import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Search, 
  Plus, 
  Edit,
  Trash2,
  Star,
  Copy,
  Play,
  Settings
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb } from "@/components/breadcrumb";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import type { PromptTemplate } from "@shared/schema";

const promptTemplateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  template: z.string().min(1, "Template is required"),
  variables: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  isDefault: z.boolean().default(false),
});

type PromptTemplateForm = z.infer<typeof promptTemplateSchema>;

const categories = [
  { value: "coaching", label: "Leadership Coaching" },
  { value: "reflection", label: "Self-Reflection" },
  { value: "goal-setting", label: "Goal Setting" },
  { value: "feedback", label: "Feedback & Growth" },
  { value: "problem-solving", label: "Problem Solving" },
  { value: "team-building", label: "Team Building" },
  { value: "communication", label: "Communication" },
  { value: "strategy", label: "Strategic Thinking" },
];

export default function PromptLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch prompt templates
  const { data: templates = [], isLoading } = useQuery<PromptTemplate[]>({
    queryKey: ["/api/prompt-templates", selectedCategory === "all" ? undefined : selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await fetch(`/api/prompt-templates${params}`);
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (data: PromptTemplateForm) => {
      const response = await fetch("/api/prompt-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      setShowCreateDialog(false);
      toast({ title: "Template created successfully" });
    },
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PromptTemplateForm> }) => {
      const response = await fetch(`/api/prompt-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      setEditingTemplate(null);
      toast({ title: "Template updated successfully" });
    },
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prompt-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
      toast({ title: "Template deleted successfully" });
    },
  });

  // Use template mutation
  const useTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/prompt-templates/${id}/use`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to use template");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompt-templates"] });
    },
  });

  const form = useForm<PromptTemplateForm>({
    resolver: zodResolver(promptTemplateSchema),
    defaultValues: {
      name: "",
      category: "",
      description: "",
      template: "",
      variables: [],
      tags: [],
      isDefault: false,
    },
  });

  // Filter templates
  const filteredTemplates = templates.filter(template => 
    !searchQuery || 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateOrUpdate = (data: PromptTemplateForm) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (template: PromptTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      category: template.category,
      description: template.description || "",
      template: template.template,
      variables: template.variables || [],
      tags: template.tags || [],
      isDefault: template.isDefault || false,
    });
    setShowCreateDialog(true);
  };

  const handleDelete = (template: PromptTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.name}"?`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    useTemplateMutation.mutate(template.id);
    // Copy to clipboard or navigate to chat with template
    navigator.clipboard.writeText(template.template);
    toast({ title: "Template copied to clipboard" });
  };

  const getCategoryLabel = (categoryValue: string) => {
    return categories.find(cat => cat.value === categoryValue)?.label || categoryValue;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumb items={[{ label: "Prompt Library", current: true }]} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Prompt Library</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Discover and create coaching prompt templates for personalized leadership development
        </p>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Templates</TabsTrigger>
            {categories.map(category => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingTemplate(null);
                form.reset();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Edit Template" : "Create New Template"}
                </DialogTitle>
                <DialogDescription>
                  Design a coaching prompt template with customizable variables
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateOrUpdate)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Template Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Goal Setting Session" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(category => (
                                  <SelectItem key={category.value} value={category.value}>
                                    {category.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of the template's purpose" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt Template</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="You are a leadership coach helping someone with {topic}. Focus on {focus_area} and provide actionable insights..."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Use {`{variable_name}`} for customizable variables
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                      {editingTemplate ? "Update" : "Create"} Template
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value={selectedCategory} className="space-y-6">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search templates by name, description, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "No templates found" : "No templates yet"}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? "Try adjusting your search terms"
                  : "Create your first coaching prompt template"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium truncate" title={template.name}>
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(template.category)}
                          </Badge>
                          {template.isDefault && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-2 w-2 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleUseTemplate(template)}>
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(template)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {template.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded mb-3 line-clamp-3">
                      {template.template}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Used {template.usageCount || 0} times</span>
                      {template.variables && template.variables.length > 0 && (
                        <span>{template.variables.length} variables</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
    </div>
  );
}