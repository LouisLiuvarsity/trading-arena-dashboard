/**
 * DashboardLayout — Dark Trading Desk style
 * Fixed sidebar + scrollable main content area
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Trophy, MessageSquare, BarChart3,
  ChevronLeft, ChevronRight, Shield, Menu, X, FileText, Calendar,
} from "lucide-react";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/6Yq9eJsfZbyndNatnSjnyG/sidebar-logo-2N3YSfimiB7wqNyCjeh5Na.webp";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: "/", label: "总览", icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: "/users", label: "用户管理", icon: <Users className="w-5 h-5" /> },
  { path: "/seasons", label: "赛季管理", icon: <Calendar className="w-5 h-5" /> },
  { path: "/competitions", label: "比赛管理", icon: <Trophy className="w-5 h-5" /> },
  { path: "/chat", label: "聊天管理", icon: <MessageSquare className="w-5 h-5" /> },
  { path: "/stats", label: "统计分析", icon: <BarChart3 className="w-5 h-5" /> },
  { path: "/logs", label: "操作日志", icon: <FileText className="w-5 h-5" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[oklch(1_0_0/8%)]">
        <img src={LOGO_URL} alt="Logo" className="w-8 h-8 shrink-0" />
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <h1 className="font-display font-bold text-sm text-white tracking-tight">Trading Arena</h1>
              <p className="text-[10px] text-[#848E9C] -mt-0.5">Admin Dashboard</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div
                onClick={() => setMobileOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${active
                    ? "bg-[oklch(0.82_0.15_85/10%)] text-[#F0B90B]"
                    : "text-[#848E9C] hover:text-[#D1D4DC] hover:bg-[oklch(1_0_0/5%)]"
                  }
                `}
              >
                <span className={`shrink-0 transition-colors ${active ? "text-[#F0B90B]" : "text-[#5E6673] group-hover:text-[#848E9C]"}`}>
                  {item.icon}
                </span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-[3px] h-6 bg-[#F0B90B] rounded-r-full"
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Admin badge */}
      <div className="px-3 pb-4">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.82_0.15_85/5%)] border border-[oklch(0.82_0.15_85/10%)] ${collapsed ? "justify-center" : ""}`}>
          <Shield className="w-4 h-4 text-[#F0B90B] shrink-0" />
          {!collapsed && (
            <span className="text-xs text-[#F0B90B] font-medium">Super Admin</span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-10 border-t border-[oklch(1_0_0/8%)] text-[#5E6673] hover:text-[#D1D4DC] transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border relative shrink-0"
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] bg-sidebar border-r border-sidebar-border z-50 flex flex-col lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b border-border bg-sidebar">
          <button onClick={() => setMobileOpen(true)} className="text-[#848E9C] hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <img src={LOGO_URL} alt="Logo" className="w-6 h-6" />
          <span className="font-display font-bold text-sm text-white">Trading Arena Admin</span>
        </div>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="p-4 lg:p-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
