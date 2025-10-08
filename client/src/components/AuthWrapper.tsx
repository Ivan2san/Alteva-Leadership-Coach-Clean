import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

interface AuthWrapperProps {
  children: React.ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.includes(location);

  // If on public route, just render children
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If not authenticated and not on public route, redirect to login
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  // 360 Gatekeeping: Lock app until 360 uploaded or sample chosen
  // Allow onboarding page itself to be accessed
  const needsOnboarding = !user?.lgp360Assessment;
  const isOnboardingRoute = location === "/onboarding";
  
  if (needsOnboarding && !isOnboardingRoute) {
    window.location.href = "/onboarding";
    return null;
  }

  // Render children for authenticated users
  return <>{children}</>;
}