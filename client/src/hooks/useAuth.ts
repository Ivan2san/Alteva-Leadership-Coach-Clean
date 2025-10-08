import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface AuthResponse {
  user: User;
}

export function useAuth() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      
      // Always try to fetch user (backend will use default admin if no token)
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch("/api/auth/me", {
        headers
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken'); // Clear invalid token
          return null;
        }
        throw new Error("Failed to fetch user");
      }
      
      const data: AuthResponse = await response.json();
      return data.user;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      // Simply remove token from localStorage
      localStorage.removeItem('authToken');
    },
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      setLocation("/login");
    },
  });

  const logout = () => {
    logoutMutation.mutate();
  };

  const isAuthenticated = !!user && !error;
  const isAdmin = user?.role === 'admin';

  return {
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}