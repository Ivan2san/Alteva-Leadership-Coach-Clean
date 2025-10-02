import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";

type Goal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number | null;
  targetDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type NewGoal = {
  title: string;
  description: string;
  category: string;
  status: string;
  progress: number;
  targetDate: string;
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  paused: "bg-yellow-100 text-yellow-800",
  abandoned: "bg-gray-100 text-gray-800",
};

const categories = [
  "Leadership",
  "Communication",
  "Strategic Thinking",
  "Team Development",
  "Personal Growth",
  "Other",
];

function useGoals(statusFilter?: string) {
  return useQuery<Goal[]>({
    queryKey: statusFilter
      ? ["/api/journey/goals/status", statusFilter]
      : ["/api/journey/goals"],
    staleTime: 30_000,
  });
}

export default function Goals() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NewGoal>({
    title: "",
    description: "",
    category: "",
    status: "active",
    progress: 0,
    targetDate: "",
  });

  const queryClient = useQueryClient();

  const { data: goals, isLoading, isError, error } = useGoals(
    statusFilter === "all" ? undefined : statusFilter
  );

  const createMutation = useMutation({
    mutationFn: async (data: NewGoal) => {
      const res = await apiRequest("POST", "/api/journey/goals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/api/journey/goals" ||
          (query.queryKey[0] === "/api/journey/goals/status")
      });
      setCreateDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Goal> }) => {
      const res = await apiRequest("PATCH", `/api/journey/goals/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/api/journey/goals" ||
          (query.queryKey[0] === "/api/journey/goals/status")
      });
      setEditingGoal(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/journey/goals/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          query.queryKey[0] === "/api/journey/goals" ||
          (query.queryKey[0] === "/api/journey/goals/status")
      });
      setDeletingGoalId(null);
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      status: "active",
      progress: 0,
      targetDate: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      description: goal.description || "",
      category: goal.category || "",
      status: goal.status,
      progress: goal.progress || 0,
      targetDate: goal.targetDate ? goal.targetDate.split("T")[0] : "",
    });
  };

  const handleUpdate = () => {
    if (!editingGoal) return;
    updateMutation.mutate({ id: editingGoal.id, data: formData });
  };

  const handleDelete = (id: string) => {
    setDeletingGoalId(id);
  };

  const confirmDelete = () => {
    if (!deletingGoalId) return;
    deleteMutation.mutate(deletingGoalId);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-gray-400";
  };

  const filteredGoals = goals || [];

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Goals</h1>
          <Button onClick={() => setCreateDialogOpen(true)}>Create Goal</Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["all", "active", "completed", "paused", "abandoned"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin h-8 w-8 text-gray-500" />
          </div>
        ) : isError ? (
          <div className="border border-red-300 bg-red-50 text-red-700 rounded-lg p-4">
            Error loading goals: {(error as Error)?.message || "Unknown error"}
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-gray-600">
            <h3 className="font-medium mb-2">No goals yet</h3>
            <p className="text-sm mb-4">Create your first goal to start tracking your progress</p>
            <Button onClick={() => setCreateDialogOpen(true)}>Create Goal</Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGoals.map((goal) => (
              <div key={goal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg">{goal.title}</h3>
                      <Badge className={statusColors[goal.status] || statusColors.active}>
                        {goal.status}
                      </Badge>
                      {goal.category && (
                        <Badge variant="outline" className="text-xs">
                          {goal.category}
                        </Badge>
                      )}
                    </div>
                    {goal.description && (
                      <p className="text-sm text-gray-600 mb-2">{goal.description}</p>
                    )}
                    {goal.targetDate && (
                      <p className="text-xs text-gray-500">
                        Target: {new Date(goal.targetDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{goal.progress || 0}%</span>
                  </div>
                  <div className="relative">
                    <Progress value={goal.progress || 0} className="h-2" />
                    <div
                      className={`absolute inset-0 h-2 rounded-full ${getProgressColor(
                        goal.progress || 0
                      )}`}
                      style={{ width: `${goal.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Goal</DialogTitle>
              <DialogDescription>
                Add a new goal to track your leadership development.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Improve team communication"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What do you want to achieve?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="targetDate">Target Date</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="progress">Initial Progress: {formData.progress}%</Label>
                <Slider
                  id="progress"
                  value={[formData.progress]}
                  onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingGoal} onOpenChange={() => setEditingGoal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>Update your goal details and progress.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Category</Label>
                <select
                  id="edit-category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="edit-status">Status</Label>
                <select
                  id="edit-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>

              <div>
                <Label htmlFor="edit-targetDate">Target Date</Label>
                <Input
                  id="edit-targetDate"
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="edit-progress">Progress: {formData.progress}%</Label>
                <Slider
                  id="edit-progress"
                  value={[formData.progress]}
                  onValueChange={(value) => setFormData({ ...formData, progress: value[0] })}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingGoal(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={!formData.title || updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Goal"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingGoalId} onOpenChange={() => setDeletingGoalId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Goal</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this goal? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Shell>
  );
}
