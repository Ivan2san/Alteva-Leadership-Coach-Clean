import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  File,
  FileImage,
  FileArchive,
  Search,
  Calendar,
  HardDrive,
  Loader,
  Tag,
  ExternalLink,
  SortAsc,
  SortDesc,
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

type KnowledgeBaseFile = {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  tags: string[] | null;
  description: string | null;
  isProcessed: boolean;
  extractedText: string | null;
  vectorStoreFileId: string | null;
  processingError: string | null;
  processedAt: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

type SortOption = "name" | "date" | "size";
type SortDirection = "asc" | "desc";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("pdf")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return FileArchive;
  if (mimeType.includes("text")) return FileText;
  return File;
}

function useKnowledgeBaseFiles() {
  return useQuery<KnowledgeBaseFile[]>({
    queryKey: ["/api/knowledge-base/files"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/knowledge-base/files");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: files = [], isLoading, isError, error } = useKnowledgeBaseFiles();

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    files.forEach((file) => {
      file.tags?.forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let filtered = files;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (file) =>
          file.originalName.toLowerCase().includes(query) ||
          file.description?.toLowerCase().includes(query) ||
          file.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((file) =>
        selectedTags.every((selectedTag) => file.tags?.includes(selectedTag))
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === "date") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "size") {
        comparison = a.fileSize - b.fileSize;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [files, searchQuery, selectedTags, sortBy, sortDirection]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(option);
      setSortDirection("desc");
    }
  };

  const SortIcon = sortDirection === "asc" ? SortAsc : SortDesc;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Library</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Coaching resources and knowledge base content
            </p>
          </div>
          <Link href="/knowledge-base">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Files
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by file name, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {allTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
                {selectedTags.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTags([])}
                    className="h-6 px-2 text-xs"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant={sortBy === "name" ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleSort("name")}
              className="gap-1"
            >
              Name
              {sortBy === "name" && <SortIcon className="h-3 w-3" />}
            </Button>
            <Button
              variant={sortBy === "date" ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleSort("date")}
              className="gap-1"
            >
              Date
              {sortBy === "date" && <SortIcon className="h-3 w-3" />}
            </Button>
            <Button
              variant={sortBy === "size" ? "secondary" : "outline"}
              size="sm"
              onClick={() => toggleSort("size")}
              className="gap-1"
            >
              Size
              {sortBy === "size" && <SortIcon className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card className="border-destructive">
            <CardContent className="py-6">
              <p className="text-destructive text-sm">
                Error loading files: {(error as Error)?.message || "Unknown error"}
              </p>
            </CardContent>
          </Card>
        ) : filteredAndSortedFiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery || selectedTags.length > 0
                  ? "No results found"
                  : "No resources yet"}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery || selectedTags.length > 0
                  ? "Try adjusting your search or filters"
                  : "Upload documents to build your knowledge base"}
              </p>
              {!searchQuery && selectedTags.length === 0 && (
                <Link href="/knowledge-base">
                  <Button>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Knowledge Base
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedFiles.map((file) => {
              const FileIcon = getFileIcon(file.mimeType);
              return (
                <Card key={file.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <FileIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate" title={file.originalName}>
                          {file.originalName}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <HardDrive className="h-3 w-3" />
                          {formatFileSize(file.fileSize)}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {file.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {file.description}
                      </p>
                    )}

                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.slice(0, 3).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                            onClick={() => toggleTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                        {file.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{file.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(file.createdAt), "MMM d, yyyy")}
                      </div>
                      <Badge
                        variant={file.isProcessed ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {file.isProcessed ? "Ready" : "Processing"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {filteredAndSortedFiles.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredAndSortedFiles.length} of {files.length} resources
          </div>
        )}
      </div>
    </Shell>
  );
}
