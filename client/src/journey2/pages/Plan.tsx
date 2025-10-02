import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader, Calendar, Target, CheckCircle, Circle, ArrowUp, ArrowDown } from "lucide-react";

type Plan = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type Milestone = {
  id: string;
  planId: string | null;
  goalId: string | null;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  order: number | null;
  createdAt: string;
  updatedAt: string;
};

type NextAction = {
  id: string;
  userId: string;
  planId: string | null;
  goalId: string | null;
  text: string;
  priority: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
};

function usePlans() {
  return useQuery<Plan[]>({
    queryKey: ["/api/journey/plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/plans");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useMilestones(planId: string | null) {
  return useQuery<Milestone[]>({
    queryKey: ["/api/journey/plans", planId, "milestones"],
    queryFn: async () => {
      if (!planId) return [];
      const res = await apiRequest("GET", `/api/journey/plans/${planId}/milestones`);
      return res.json();
    },
    enabled: !!planId,
    staleTime: 30_000,
  });
}

function useNextActions(planId: string | null) {
  return useQuery<NextAction[]>({
    queryKey: ["/api/journey/next-actions", { planId: planId || undefined }],
    queryFn: async () => {
      const url = planId ? `/api/journey/next-actions?planId=${planId}` : "/api/journey/next-actions";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!planId,
    staleTime: 30_000,
  });
}

export default function Plan() {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const [createMilestoneOpen, setCreateMilestoneOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [deletingMilestoneId, setDeletingMilestoneId] = useState<string | null>(null);

  const [createActionOpen, setCreateActionOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<NextAction | null>(null);
  const [deletingActionId, setDeletingActionId] = useState<string | null>(null);
  const [actionStatusFilter, setActionStatusFilter] = useState<string>("all");

  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    status: "active",
    startDate: "",
    endDate: "",
  });

  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    status: "pending",
    dueDate: "",
    order: 0,
  });

  const [actionForm, setActionForm] = useState({
    text: "",
    priority: "medium",
    status: "pending",
    dueDate: "",
  });

  const queryClient = useQueryClient();

  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: milestones, isLoading: milestonesLoading } = useMilestones(selectedPlanId);
  const { data: nextActions, isLoading: actionsLoading } = useNextActions(selectedPlanId);

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  const createPlanMutation = useMutation({
    mutationFn: async (data: typeof planForm) => {
      const res = await apiRequest("POST", "/api/journey/plans", data);
      return res.json();
    },
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey/plans"] });
      setCreatePlanOpen(false);
      setSelectedPlanId(newPlan.id);
      resetPlanForm();
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Plan> }) => {
      const res = await apiRequest("PATCH", `/api/journey/plans/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey/plans"] });
      setEditingPlan(null);
      resetPlanForm();
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/journey/plans/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journey/plans"] });
      setDeletingPlanId(null);
      setSelectedPlanId(null);
    },
  });

  const createMilestoneMutation = useMutation({
    mutationFn: async (data: typeof milestoneForm) => {
      const res = await apiRequest("POST", `/api/journey/plans/${selectedPlanId}/milestones`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/plans" && query.queryKey[2] === "milestones"
      });
      setCreateMilestoneOpen(false);
      resetMilestoneForm();
    },
  });

  const updateMilestoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Milestone> }) => {
      const res = await apiRequest("PATCH", `/api/journey/milestones/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/plans" && query.queryKey[2] === "milestones"
      });
      setEditingMilestone(null);
      resetMilestoneForm();
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/journey/milestones/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/plans" && query.queryKey[2] === "milestones"
      });
      setDeletingMilestoneId(null);
    },
  });

  const createActionMutation = useMutation({
    mutationFn: async (data: typeof actionForm & { planId: string }) => {
      const res = await apiRequest("POST", "/api/journey/next-actions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/next-actions"
      });
      setCreateActionOpen(false);
      resetActionForm();
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NextAction> }) => {
      const res = await apiRequest("PATCH", `/api/journey/next-actions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/next-actions"
      });
      setEditingAction(null);
      resetActionForm();
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/journey/next-actions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === "/api/journey/next-actions"
      });
      setDeletingActionId(null);
    },
  });

  const resetPlanForm = () => {
    setPlanForm({ title: "", description: "", status: "active", startDate: "", endDate: "" });
  };

  const resetMilestoneForm = () => {
    setMilestoneForm({ title: "", description: "", status: "pending", dueDate: "", order: 0 });
  };

  const resetActionForm = () => {
    setActionForm({ text: "", priority: "medium", status: "pending", dueDate: "" });
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title,
      description: plan.description || "",
      status: plan.status,
      startDate: plan.startDate ? plan.startDate.split("T")[0] : "",
      endDate: plan.endDate ? plan.endDate.split("T")[0] : "",
    });
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setMilestoneForm({
      title: milestone.title,
      description: milestone.description || "",
      status: milestone.status,
      dueDate: milestone.dueDate ? milestone.dueDate.split("T")[0] : "",
      order: milestone.order || 0,
    });
  };

  const handleEditAction = (action: NextAction) => {
    setEditingAction(action);
    setActionForm({
      text: action.text,
      priority: action.priority || "medium",
      status: action.status,
      dueDate: action.dueDate ? action.dueDate.split("T")[0] : "",
    });
  };

  const filteredActions = nextActions?.filter(action => 
    actionStatusFilter === "all" || action.status === actionStatusFilter
  ) || [];

  if (plansLoading) {
    return (
      <Shell>
        <div className="flex items-center justify-center py-12">
          <Loader className="animate-spin h-8 w-8 text-gray-500" />
        </div>
      </Shell>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Shell>
        <div className="border rounded-lg p-8 text-center">
          <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="font-medium text-lg mb-2">No plans yet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create your first plan to organize your goals, milestones, and next actions
          </p>
          <Button onClick={() => setCreatePlanOpen(true)}>Create Your First Plan</Button>
        </div>

        <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
              <DialogDescription>
                Create a plan to organize your leadership development journey.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={planForm.title}
                  onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                  placeholder="e.g., Q1 Leadership Development"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Describe your plan..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={planForm.endDate}
                    onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreatePlanOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => createPlanMutation.mutate(planForm)} 
                disabled={!planForm.title || createPlanMutation.isPending}
              >
                {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Plans</h2>
            <Button size="sm" onClick={() => setCreatePlanOpen(true)}>New Plan</Button>
          </div>

          <div className="space-y-2">
            {plans.map(plan => (
              <Card 
                key={plan.id} 
                className={`cursor-pointer transition-colors ${selectedPlanId === plan.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{plan.title}</h3>
                    <Badge className={statusColors[plan.status] || statusColors.active} variant="secondary">
                      {plan.status}
                    </Badge>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{plan.description}</p>
                  )}
                  {(plan.startDate || plan.endDate) && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {plan.startDate && new Date(plan.startDate).toLocaleDateString()} 
                        {plan.startDate && plan.endDate && " - "}
                        {plan.endDate && new Date(plan.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-8 space-y-6">
          {selectedPlan ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{selectedPlan.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={statusColors[selectedPlan.status] || statusColors.active}>
                          {selectedPlan.status}
                        </Badge>
                        {(selectedPlan.startDate || selectedPlan.endDate) && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {selectedPlan.startDate && new Date(selectedPlan.startDate).toLocaleDateString()}
                              {selectedPlan.startDate && selectedPlan.endDate && " - "}
                              {selectedPlan.endDate && new Date(selectedPlan.endDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditPlan(selectedPlan)}>
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDeletingPlanId(selectedPlan.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {selectedPlan.description && (
                  <CardContent>
                    <p className="text-gray-700">{selectedPlan.description}</p>
                  </CardContent>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Milestones</CardTitle>
                    <Button size="sm" onClick={() => setCreateMilestoneOpen(true)}>Add Milestone</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {milestonesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader className="animate-spin h-6 w-6 text-gray-500" />
                    </div>
                  ) : milestones && milestones.length > 0 ? (
                    <div className="space-y-3">
                      {milestones.map((milestone) => (
                        <div key={milestone.id} className="border rounded-lg p-3 flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {milestone.status === "completed" ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : milestone.status === "in_progress" ? (
                                <Circle className="h-5 w-5 text-blue-600 fill-blue-100" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-400" />
                              )}
                              <h4 className="font-medium">{milestone.title}</h4>
                              <Badge className={`${statusColors[milestone.status]} text-xs`} variant="secondary">
                                {milestone.status}
                              </Badge>
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 ml-7">{milestone.description}</p>
                            )}
                            {milestone.dueDate && (
                              <p className="text-xs text-gray-500 ml-7 mt-1">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditMilestone(milestone)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDeletingMilestoneId(milestone.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No milestones yet. Add your first milestone to track progress.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Next Actions</CardTitle>
                    <Button size="sm" onClick={() => setCreateActionOpen(true)}>Add Action</Button>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {["all", "pending", "in_progress", "completed"].map((status) => (
                      <Button
                        key={status}
                        variant={actionStatusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActionStatusFilter(status)}
                      >
                        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
                      </Button>
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  {actionsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader className="animate-spin h-6 w-6 text-gray-500" />
                    </div>
                  ) : filteredActions.length > 0 ? (
                    <div className="space-y-2">
                      {filteredActions.map((action) => (
                        <div key={action.id} className="border rounded-lg p-3 flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`${priorityColors[action.priority || "medium"]} text-xs`} variant="secondary">
                                {action.priority || "medium"}
                              </Badge>
                              <Badge className={`${statusColors[action.status]} text-xs`} variant="secondary">
                                {action.status.replace("_", " ")}
                              </Badge>
                              <span className="text-sm">{action.text}</span>
                            </div>
                            {action.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {new Date(action.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditAction(action)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setDeletingActionId(action.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {actionStatusFilter === "all" ? "No actions yet. Add your first action to get started." : `No ${actionStatusFilter.replace("_", " ")} actions.`}
                    </p>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="border rounded-lg p-12 text-center text-gray-500">
              <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p>Select a plan to view details, milestones, and next actions</p>
            </div>
          )}
        </div>
      </div>

      <Dialog open={createPlanOpen} onOpenChange={setCreatePlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Plan</DialogTitle>
            <DialogDescription>Create a plan to organize your leadership development journey.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create-title">Title *</Label>
              <Input
                id="create-title"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                placeholder="e.g., Q1 Leadership Development"
              />
            </div>

            <div>
              <Label htmlFor="create-description">Description</Label>
              <Textarea
                id="create-description"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                placeholder="Describe your plan..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-startDate">Start Date</Label>
                <Input
                  id="create-startDate"
                  type="date"
                  value={planForm.startDate}
                  onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="create-endDate">End Date</Label>
                <Input
                  id="create-endDate"
                  type="date"
                  value={planForm.endDate}
                  onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreatePlanOpen(false); resetPlanForm(); }}>Cancel</Button>
            <Button 
              onClick={() => createPlanMutation.mutate(planForm)} 
              disabled={!planForm.title || createPlanMutation.isPending}
            >
              {createPlanMutation.isPending ? "Creating..." : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPlan} onOpenChange={() => { setEditingPlan(null); resetPlanForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>Update your plan details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-plan-title">Title *</Label>
              <Input
                id="edit-plan-title"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-plan-description">Description</Label>
              <Textarea
                id="edit-plan-description"
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-plan-status">Status</Label>
              <select
                id="edit-plan-status"
                value={planForm.status}
                onChange={(e) => setPlanForm({ ...planForm, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-plan-startDate">Start Date</Label>
                <Input
                  id="edit-plan-startDate"
                  type="date"
                  value={planForm.startDate}
                  onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-plan-endDate">End Date</Label>
                <Input
                  id="edit-plan-endDate"
                  type="date"
                  value={planForm.endDate}
                  onChange={(e) => setPlanForm({ ...planForm, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingPlan(null); resetPlanForm(); }}>Cancel</Button>
            <Button 
              onClick={() => editingPlan && updatePlanMutation.mutate({ id: editingPlan.id, data: planForm })} 
              disabled={!planForm.title || updatePlanMutation.isPending}
            >
              {updatePlanMutation.isPending ? "Updating..." : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createMilestoneOpen} onOpenChange={setCreateMilestoneOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Milestone</DialogTitle>
            <DialogDescription>Add a milestone to track progress in your plan.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="milestone-title">Title *</Label>
              <Input
                id="milestone-title"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
                placeholder="e.g., Complete leadership training"
              />
            </div>

            <div>
              <Label htmlFor="milestone-description">Description</Label>
              <Textarea
                id="milestone-description"
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                placeholder="Describe this milestone..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="milestone-dueDate">Due Date</Label>
              <Input
                id="milestone-dueDate"
                type="date"
                value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="milestone-order">Order</Label>
              <Input
                id="milestone-order"
                type="number"
                value={milestoneForm.order}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateMilestoneOpen(false); resetMilestoneForm(); }}>Cancel</Button>
            <Button 
              onClick={() => createMilestoneMutation.mutate(milestoneForm)} 
              disabled={!milestoneForm.title || createMilestoneMutation.isPending}
            >
              {createMilestoneMutation.isPending ? "Adding..." : "Add Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingMilestone} onOpenChange={() => { setEditingMilestone(null); resetMilestoneForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Milestone</DialogTitle>
            <DialogDescription>Update milestone details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-milestone-title">Title *</Label>
              <Input
                id="edit-milestone-title"
                value={milestoneForm.title}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-milestone-description">Description</Label>
              <Textarea
                id="edit-milestone-description"
                value={milestoneForm.description}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="edit-milestone-status">Status</Label>
              <select
                id="edit-milestone-status"
                value={milestoneForm.status}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-milestone-dueDate">Due Date</Label>
              <Input
                id="edit-milestone-dueDate"
                type="date"
                value={milestoneForm.dueDate}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-milestone-order">Order</Label>
              <Input
                id="edit-milestone-order"
                type="number"
                value={milestoneForm.order}
                onChange={(e) => setMilestoneForm({ ...milestoneForm, order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingMilestone(null); resetMilestoneForm(); }}>Cancel</Button>
            <Button 
              onClick={() => editingMilestone && updateMilestoneMutation.mutate({ id: editingMilestone.id, data: milestoneForm })} 
              disabled={!milestoneForm.title || updateMilestoneMutation.isPending}
            >
              {updateMilestoneMutation.isPending ? "Updating..." : "Update Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createActionOpen} onOpenChange={setCreateActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Next Action</DialogTitle>
            <DialogDescription>Add an action item for this plan.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="action-text">Action *</Label>
              <Input
                id="action-text"
                value={actionForm.text}
                onChange={(e) => setActionForm({ ...actionForm, text: e.target.value })}
                placeholder="e.g., Schedule 1:1 with team member"
              />
            </div>

            <div>
              <Label htmlFor="action-priority">Priority</Label>
              <select
                id="action-priority"
                value={actionForm.priority}
                onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <Label htmlFor="action-dueDate">Due Date</Label>
              <Input
                id="action-dueDate"
                type="date"
                value={actionForm.dueDate}
                onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateActionOpen(false); resetActionForm(); }}>Cancel</Button>
            <Button 
              onClick={() => selectedPlanId && createActionMutation.mutate({ ...actionForm, planId: selectedPlanId })} 
              disabled={!actionForm.text || createActionMutation.isPending}
            >
              {createActionMutation.isPending ? "Adding..." : "Add Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingAction} onOpenChange={() => { setEditingAction(null); resetActionForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Next Action</DialogTitle>
            <DialogDescription>Update action details.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-action-text">Action *</Label>
              <Input
                id="edit-action-text"
                value={actionForm.text}
                onChange={(e) => setActionForm({ ...actionForm, text: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="edit-action-priority">Priority</Label>
              <select
                id="edit-action-priority"
                value={actionForm.priority}
                onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-action-status">Status</Label>
              <select
                id="edit-action-status"
                value={actionForm.status}
                onChange={(e) => setActionForm({ ...actionForm, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <Label htmlFor="edit-action-dueDate">Due Date</Label>
              <Input
                id="edit-action-dueDate"
                type="date"
                value={actionForm.dueDate}
                onChange={(e) => setActionForm({ ...actionForm, dueDate: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingAction(null); resetActionForm(); }}>Cancel</Button>
            <Button 
              onClick={() => editingAction && updateActionMutation.mutate({ id: editingAction.id, data: actionForm })} 
              disabled={!actionForm.text || updateActionMutation.isPending}
            >
              {updateActionMutation.isPending ? "Updating..." : "Update Action"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingPlanId} onOpenChange={() => setDeletingPlanId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this plan? This will also delete all associated milestones and actions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPlanId && deletePlanMutation.mutate(deletingPlanId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletePlanMutation.isPending}
            >
              {deletePlanMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingMilestoneId} onOpenChange={() => setDeletingMilestoneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Milestone</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this milestone? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingMilestoneId && deleteMilestoneMutation.mutate(deletingMilestoneId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMilestoneMutation.isPending}
            >
              {deleteMilestoneMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingActionId} onOpenChange={() => setDeletingActionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this action? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingActionId && deleteActionMutation.mutate(deletingActionId)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteActionMutation.isPending}
            >
              {deleteActionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
