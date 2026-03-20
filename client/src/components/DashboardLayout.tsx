import { useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Shield,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

const LOGO_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/6Yq9eJsfZbyndNatnSjnyG/sidebar-logo-2N3YSfimiB7wqNyCjeh5Na.webp";

const navItems = [
  { path: "/", label: "总览", icon: LayoutDashboard },
  { path: "/users", label: "用户管理", icon: Users },
  { path: "/seasons", label: "赛季管理", icon: Calendar },
  { path: "/competitions", label: "比赛管理", icon: Trophy },
  { path: "/chat", label: "聊天管理", icon: MessageSquare },
  { path: "/stats", label: "统计分析", icon: BarChart3 },
  { path: "/logs", label: "操作日志", icon: FileText },
];

function NavLink({
  path,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={path}
      onClick={onNavigate}
      className={`group inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-[#F0B90B]/25 bg-[#F0B90B]/10 text-[#F0B90B]"
          : "border-white/[0.06] bg-white/[0.03] text-[#9AA4B5] hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-[#F0B90B]" : "text-[#6D7788] group-hover:text-[#D1D7E0]"}`} />
      <span>{label}</span>
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated, logout, user } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) return null;

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const rawUser = user as Record<string, unknown> | null | undefined;
  const adminName =
    user?.name ||
    (typeof rawUser?.nickname === "string" ? rawUser.nickname : undefined) ||
    (typeof rawUser?.email === "string" ? rawUser.email : undefined) ||
    (typeof rawUser?.username === "string" ? rawUser.username : undefined) ||
    "Admin";

  return (
    <div className="admin-shell flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0B0F17]/82 backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#AAB3C1] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="flex min-w-0 items-center gap-3">
              <img src={LOGO_URL} alt="Trading Arena" className="h-10 w-10 rounded-2xl border border-white/[0.08]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-display font-bold text-white">Trading Arena Admin</p>
                <p className="truncate text-[11px] text-[#7F899A]">Live operations, approvals, and control room</p>
              </div>
            </Link>

            <div className="ml-auto hidden items-center gap-2 lg:flex">
              <span className="admin-chip">
                <Shield className="h-3.5 w-3.5 text-[#F0B90B]" />
                Super Admin
              </span>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F0B90B]/12 font-display text-sm font-bold text-[#F0B90B]">
                  {String(adminName).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#778296]">Administrator</p>
                  <p className="max-w-[180px] truncate text-sm font-medium text-[#E6EBF2]">{adminName}</p>
                </div>
                <button
                  onClick={() => void logout()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-black/10 text-[#9AA4B5] transition-colors hover:text-[#F6465D]"
                  title="退出登录"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <nav className="mt-4 hidden items-center gap-2 overflow-x-auto pb-1 lg:flex no-scrollbar">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                path={item.path}
                label={item.label}
                icon={item.icon}
                active={isActive(item.path)}
              />
            ))}
          </nav>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[288px] flex-col border-r border-white/[0.08] bg-[#0C1018] p-4 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={LOGO_URL} alt="Trading Arena" className="h-10 w-10 rounded-2xl border border-white/[0.08]" />
                  <div>
                    <p className="text-sm font-display font-bold text-white">Admin Console</p>
                    <p className="text-[11px] text-[#7E8898]">Navigation</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-[#AAB3C1]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    path={item.path}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.path)}
                    onNavigate={() => setMobileOpen(false)}
                  />
                ))}
              </div>

              <div className="mt-auto rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F0B90B]/12 font-display text-base font-bold text-[#F0B90B]">
                    {String(adminName).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#778296]">Administrator</p>
                    <p className="truncate text-sm font-medium text-white">{adminName}</p>
                  </div>
                </div>
                <button
                  onClick={() => void logout()}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#F6465D]/20 bg-[#F6465D]/10 px-4 py-3 text-sm font-medium text-[#F6465D]"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto">
        <motion.div
          key={location}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="mx-auto max-w-[1600px] px-4 py-6 lg:px-8 lg:py-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
