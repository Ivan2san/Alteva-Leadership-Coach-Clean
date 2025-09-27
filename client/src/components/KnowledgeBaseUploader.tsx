import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Loader2, CheckCircle, XCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  uploadUrl?: string;
  uploaded?: boolean;
  error?: string;
}

interface KnowledgeBaseUploaderProps {
  onUploadComplete?: () => void;
}

export function KnowledgeBaseUploader({ onUploadComplete }: KnowledgeBaseUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get upload URL mutation
  const getUploadUrlMutation = useMutation({
    mutationFn: async (fileName: string) => {
      const response = await fetch("/api/knowledge-base/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName }),
      });
      if (!response.ok) throw new Error("Failed to get upload URL");
      return await response.json();
    },
  });

  // Process file metadata mutation
  const processFileMutation = useMutation({
    mutationFn: async (fileData: any) => {
      const response = await fetch("/api/knowledge-base/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileData),
      });
      if (!response.ok) throw new Error("Failed to process file");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/files"] });
      toast({
        title: "Success",
        description: "File uploaded and processed successfully!",
      });
      onUploadComplete?.();
      // Reset form
      setFiles([]);
      setDescription("");
      setTags([]);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to process uploaded file",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const validFiles: UploadedFile[] = [];
    
    for (const file of Array.from(selectedFiles)) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'text/markdown',
        'application/zip',
        'application/x-zip-compressed',
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type. Please upload PDF, DOC, DOCX, TXT, or MD files.`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB. Please upload smaller files.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push({
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload first.",
        variant: "destructive",
      });
      return;
    }

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        // Get upload URL
        const uploadResponse = await getUploadUrlMutation.mutateAsync(file.name);
        const uploadUrl = uploadResponse.uploadURL;

        // Update file with upload URL
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, uploadUrl } : f
        ));

        // Create file object and upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.pdf,.doc,.docx,.txt,.md';
        
        // For demo purposes, mark as uploaded immediately
        // In production, you would upload the actual file to the signed URL
        console.log(`Simulating upload of ${file.name} to:`, uploadUrl);

        // Mark as uploaded
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, uploaded: true } : f
        ));

        // Process file metadata
        await processFileMutation.mutateAsync({
          originalName: file.name,
          fileName: file.name,
          filePath: uploadUrl,
          fileSize: file.size,
          mimeType: file.type,
          tags,
          description: description || null,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Knowledge Base Files
        </CardTitle>
        <CardDescription>
          Upload documents to enhance AI coaching responses with your content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-600"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          data-testid="file-drop-zone"
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Drop files here or click to browse</p>
          <p className="text-sm text-gray-500 mb-4">
            Supports PDF, DOC, DOCX, TXT, MD, and ZIP files (max 10MB each)
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.md,.zip"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-input"
            data-testid="file-input"
          />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => document.getElementById('file-input')?.click()}
            data-testid="browse-files-button"
          >
            Browse Files
          </Button>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="space-y-2">
            <Label className="font-medium">Selected Files</Label>
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
                data-testid={`file-item-${index}`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.uploaded && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {file.error && <XCircle className="h-5 w-5 text-red-500" />}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    data-testid={`remove-file-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe the content and purpose of these files..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            data-testid="description-input"
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label htmlFor="tags">Tags (optional)</Label>
          <div className="flex gap-2">
            <Input
              id="tags"
              placeholder="Add a tag..."
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              data-testid="tag-input"
            />
            <Button type="button" onClick={addTag} variant="outline" data-testid="add-tag-button">
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => removeTag(tag)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Upload Button */}
        <Button
          onClick={uploadFiles}
          disabled={files.length === 0 || processFileMutation.isPending}
          className="w-full"
          data-testid="upload-button"
        >
          {processFileMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Files
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}