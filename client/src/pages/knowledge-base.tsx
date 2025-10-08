import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Search, 
  Upload, 
  Trash2, 
  Edit, 
  Download,
  Calendar,
  Tag,
  HardDrive
} from "lucide-react";
import { KnowledgeBaseUploader } from "@/components/KnowledgeBaseUploader";
import { Breadcrumb } from "@/components/breadcrumb";
import Header from "@/components/header";
import MainNavigation from "@/components/MainNavigation";
import type { KnowledgeBaseFile } from "@shared/schema";

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showUploader, setShowUploader] = useState(false);

  // Fetch knowledge base files
  const { data: files = [], isLoading, refetch } = useQuery<KnowledgeBaseFile[]>({
    queryKey: ["/api/knowledge-base/files"],
  });

  // Filter files based on search
  const filteredFiles = files.filter(file => 
    file.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MainNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumb items={[{ label: "Knowledge Base", current: true }]} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Knowledge Base</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your leadership development resources and documentation
        </p>
      </div>

      <Tabs defaultValue="files" className="space-y-6">
        <TabsList>
          <TabsTrigger value="files" data-testid="files-tab">Files</TabsTrigger>
          <TabsTrigger value="upload" data-testid="upload-tab">Upload</TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="space-y-6">
          {/* Search and Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Knowledge Base Files ({files.length})
                </span>
                <Button 
                  onClick={() => setShowUploader(true)}
                  data-testid="show-uploader-button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </CardTitle>
              <CardDescription>
                Documents and resources available to enhance AI coaching responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files, descriptions, or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="search-input"
                  />
                </div>
              </div>

              {/* Files Grid */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Loading files...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery ? "No files found" : "No files uploaded yet"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery 
                      ? "Try adjusting your search terms"
                      : "Upload documents to enhance your AI coaching experience"
                    }
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setShowUploader(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Your First File
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredFiles.map((file) => (
                    <Card key={file.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate" title={file.originalName}>
                                {file.originalName}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <HardDrive className="h-3 w-3" />
                                {formatFileSize(file.fileSize)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="sm" data-testid={`edit-file-${file.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`delete-file-${file.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {file.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                            {file.description}
                          </p>
                        )}
                        
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {file.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {file.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{file.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(file.createdAt)}
                          </div>
                          <div className={`px-2 py-1 rounded text-xs font-medium ${
                            file.isProcessed 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          }`}>
                            {file.isProcessed ? "Processed" : "Processing"}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <div className="flex justify-center">
            <KnowledgeBaseUploader onUploadComplete={handleUploadComplete} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Knowledge Base Files</h2>
              <Button 
                variant="ghost" 
                onClick={() => setShowUploader(false)}
                data-testid="close-uploader-button"
              >
                ×
              </Button>
            </div>
            <KnowledgeBaseUploader onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}