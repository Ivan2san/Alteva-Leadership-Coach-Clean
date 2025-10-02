import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Shell from "@/journey2/components/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Loader, Flame, Edit2, Trash2, CheckCircle } from "lucide-react";
import { format } from "date-fns";

type CheckIn = {
  id: string;
  userId: string;
  date: string;
  mood: number;
  energy: number | null;
  focus: number | null;
  note: string | null;
  isWeekly: boolean | null;
  createdAt: string;
};

type NewCheckIn = {
  date: Date;
  mood: number;
  energy: number;
  focus: number;
  note: string;
};

const moodEmojis = ["😢", "😟", "😕", "😐", "🙂", "😊", "😄", "😁", "🤩", "🎉"];

function getMoodEmoji(value: number): string {
  return moodEmojis[value - 1] || "😐";
}

function getMoodColor(value: number): string {
  if (value <= 3) return "text-red-600";
  if (value <= 5) return "text-orange-500";
  if (value <= 7) return "text-yellow-500";
  return "text-green-600";
}

function useCheckIns(limit?: number) {
  return useQuery<CheckIn[]>({
    queryKey: limit ? ["/api/journey/check-ins", { limit }] : ["/api/journey/check-ins"],
    queryFn: async () => {
      const url = limit ? `/api/journey/check-ins?limit=${limit}` : "/api/journey/check-ins";
      const res = await apiRequest("GET", url);
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useTodayCheckIn() {
  return useQuery<CheckIn | null>({
    queryKey: ["/api/journey/check-ins/today"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/check-ins/today");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useCheckInStreak() {
  return useQuery<{ streak: number }>({
    queryKey: ["/api/journey/check-ins/streak"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/journey/check-ins/streak");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export default function CheckIns() {
  const queryClient = useQueryClient();
  const [mood, setMood] = useState([5]);
  const [energy, setEnergy] = useState([5]);
  const [focus, setFocus] = useState([5]);
  const [note, setNote] = useState("");
  const [editingCheckIn, setEditingCheckIn] = useState<CheckIn | null>(null);
  const [deleteCheckInId, setDeleteCheckInId] = useState<string | null>(null);

  const { data: checkIns = [], isLoading: checkInsLoading } = useCheckIns(30);
  const { data: todayCheckIn, isLoading: todayLoading } = useTodayCheckIn();
  const { data: streakData } = useCheckInStreak();

  const createCheckInMutation = useMutation({
    mutationFn: async (data: NewCheckIn) => {
      const res = await apiRequest("POST", "/api/journey/check-ins", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/journey/check-ins" || 
        (Array.isArray(query.queryKey[0]) && query.queryKey[0].includes("check-ins"))
      });
      setMood([5]);
      setEnergy([5]);
      setFocus([5]);
      setNote("");
    },
  });

  const updateCheckInMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CheckIn> }) => {
      const res = await apiRequest("PATCH", `/api/journey/check-ins/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/journey/check-ins" || 
        (Array.isArray(query.queryKey[0]) && query.queryKey[0].includes("check-ins"))
      });
      setEditingCheckIn(null);
    },
  });

  const deleteCheckInMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/journey/check-ins/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/journey/check-ins" || 
        (Array.isArray(query.queryKey[0]) && query.queryKey[0].includes("check-ins"))
      });
      setDeleteCheckInId(null);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCheckIn) {
      updateCheckInMutation.mutate({
        id: editingCheckIn.id,
        data: {
          mood: mood[0],
          energy: energy[0],
          focus: focus[0],
          note: note.trim() || null,
        },
      });
    } else {
      createCheckInMutation.mutate({
        date: new Date(),
        mood: mood[0],
        energy: energy[0],
        focus: focus[0],
        note: note.trim() || null,
      });
    }
  };

  const handleEdit = (checkIn: CheckIn) => {
    setEditingCheckIn(checkIn);
    setMood([checkIn.mood]);
    setEnergy([checkIn.energy || 5]);
    setFocus([checkIn.focus || 5]);
    setNote(checkIn.note || "");
  };

  const handleCancelEdit = () => {
    setEditingCheckIn(null);
    setMood([5]);
    setEnergy([5]);
    setFocus([5]);
    setNote("");
  };

  const isLoading = checkInsLoading || todayLoading;
  const hasCheckedInToday = todayCheckIn && !editingCheckIn;
  const streak = streakData?.streak || 0;

  return (
    <Shell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Daily Check-ins</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your daily mood, energy, and focus
            </p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{streak}</div>
                <div className="text-xs text-muted-foreground">day streak</div>
              </div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasCheckedInToday ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Today's Check-in Complete
                </CardTitle>
                <CardDescription>{format(new Date(todayCheckIn.date), "MMMM d, yyyy")}</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(todayCheckIn)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Mood</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`text-3xl ${getMoodColor(todayCheckIn.mood)}`}>
                      {getMoodEmoji(todayCheckIn.mood)}
                    </span>
                    <span className="text-xl font-semibold">{todayCheckIn.mood}/10</span>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Energy</div>
                  <div className="mt-1 text-xl font-semibold">{todayCheckIn.energy || 0}/10</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Focus</div>
                  <div className="mt-1 text-xl font-semibold">{todayCheckIn.focus || 0}/10</div>
                </div>
              </div>
              {todayCheckIn.note && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Note</div>
                  <p className="mt-1 text-sm">{todayCheckIn.note}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>{editingCheckIn ? "Edit Check-in" : "Today's Check-in"}</CardTitle>
              <CardDescription>
                {editingCheckIn
                  ? `Editing check-in from ${format(new Date(editingCheckIn.date), "MMMM d, yyyy")}`
                  : "How are you feeling today?"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Mood <span className={`text-2xl ${getMoodColor(mood[0])}`}>{getMoodEmoji(mood[0])}</span>
                    </label>
                    <span className="text-sm text-muted-foreground">{mood[0]}/10</span>
                  </div>
                  <Slider
                    value={mood}
                    onValueChange={setMood}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Energy</label>
                    <span className="text-sm text-muted-foreground">{energy[0]}/10</span>
                  </div>
                  <Slider
                    value={energy}
                    onValueChange={setEnergy}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Focus</label>
                    <span className="text-sm text-muted-foreground">{focus[0]}/10</span>
                  </div>
                  <Slider
                    value={focus}
                    onValueChange={setFocus}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Any thoughts or reflections..."
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createCheckInMutation.isPending || updateCheckInMutation.isPending}
                    className="flex-1"
                  >
                    {(createCheckInMutation.isPending || updateCheckInMutation.isPending) && (
                      <Loader className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingCheckIn ? "Update Check-in" : "Submit Check-in"}
                  </Button>
                  {editingCheckIn && (
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="mb-4 text-lg font-semibold">Check-in History</h3>
          {checkIns.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No check-ins yet. Start tracking today!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {checkIns.map((checkIn) => (
                <Card key={checkIn.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {format(new Date(checkIn.date), "EEEE, MMMM d, yyyy")}
                          </span>
                          {format(new Date(checkIn.date), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") && (
                            <Badge variant="secondary">Today</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Mood:</span>
                            <span className={`${getMoodColor(checkIn.mood)}`}>
                              {getMoodEmoji(checkIn.mood)} {checkIn.mood}/10
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Energy:</span>
                            <span>{checkIn.energy || 0}/10</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Focus:</span>
                            <span>{checkIn.focus || 0}/10</span>
                          </div>
                        </div>
                        {checkIn.note && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{checkIn.note}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(checkIn)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteCheckInId(checkIn.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteCheckInId} onOpenChange={() => setDeleteCheckInId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Check-in</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this check-in? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCheckInId && deleteCheckInMutation.mutate(deleteCheckInId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCheckInMutation.isPending && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Shell>
  );
}
