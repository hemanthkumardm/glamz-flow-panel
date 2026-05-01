import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Receipt,
  UserCog,
  Tag,
  Settings as SettingsIcon,
  Megaphone,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true, adminOnly: true },
  { to: "/customers", icon: Users, label: "Customers" },
  { to: "/billing", icon: Receipt, label: "Billing" },
  { to: "/plans", icon: Tag, label: "Plans", adminOnly: true },
  { to: "/team", icon: UserCog, label: "Team", adminOnly: true },
  { to: "/settings", icon: SettingsIcon, label: "Settings", adminOnly: true },
  { to: "/offers", icon: Megaphone, label: "Offers", adminOnly: true },
];

export default function AppLayout() {
  const { fullName, role, isAdmin, signOut } = useAuth();
  const nav = useNavigate();

  const visible = navItems.filter((i) => !i.adminOnly || isAdmin);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="w-56 shrink-0 border-r bg-card flex flex-col">
        <div className="px-4 py-4 border-b flex items-center gap-2">
          <div className="h-8 w-8 rounded-md overflow-hidden grid place-items-center">
            <img src="/smg.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">S M Glamz</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{isAdmin ? 'Admin Panel' : 'Staff Panel'}</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {visible.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors ${isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`
              }
            >
              <i.icon className="h-4 w-4" />
              {i.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{fullName || "User"}</div>
              <Badge variant={isAdmin ? "default" : "secondary"} className="mt-0.5 text-[10px] py-0 h-4">
                {role}
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8"
            onClick={async () => {
              await signOut();
              nav("/auth");
            }}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
