import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export default function RequireAuth({ children, adminOnly }: { children: ReactNode; adminOnly?: boolean }) {
  const { user, loading, isAdmin } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" state={{ from: loc }} replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/billing" replace />;
  return <>{children}</>;
}
