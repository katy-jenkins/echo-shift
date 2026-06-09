import { Outlet, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CalendarDays, Users, Menu, X, LayoutList, GraduationCap, CalendarRange, CalendarCheck } from "lucide-react";

const navItems = [
  { path: "/", label: "Roster", icon: CalendarDays },
  { path: "/summary", label: "Absence Summary", icon: LayoutList },
  { path: "/term-calendar", label: "Term Calendar", icon: CalendarCheck },
  { path: "/support-scheduler", label: "Support Scheduler", icon: CalendarRange },
  { path: "/students", label: "Students", icon: GraduationCap },
  { path: "/workers", label: "Workers", icon: Users },
];

export default function AppLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card fixed inset-y-0 left-0 z-30">
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground tracking-tight">Staff Roster</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Schedule & Leave Manager</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                location.pathname === item.path
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Staff Roster</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-muted">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="w-64 bg-card h-full pt-16 p-4 space-y-1" onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}