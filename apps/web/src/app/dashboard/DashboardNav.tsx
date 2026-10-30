"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Logo } from "@/components/ui/Logo";
import { StatusDot } from "@/components/ui/StatusDot";
import {
  FolderKanban,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export interface DashboardProjectNav {
  id: string;
  name: string;
  slug: string;
  status: "Waiting for first event" | "Connected" | "Silent";
}

export function DashboardNav({
  user,
  projects,
}: {
  user: { name?: string | null; email?: string | null; image?: string | null };
  projects: DashboardProjectNav[];
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Compute breadcrumbs
  const pathParts = pathname.split("/").filter(Boolean);
  // e.g. ["dashboard", "projects", "my-slug", "incidents", "id"]

  return (
    <>
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 h-14 border-b border-border bg-surface px-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo textClassName="text-sm font-bold" />
        </Link>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-2"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-bg/80 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Logo & Brand */}
          <div className="h-16 px-5 border-b border-border flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Logo textClassName="text-base font-bold" />
            </Link>
            <Link
              href="/"
              target="_blank"
              title="Open landing page"
              className="text-muted hover:text-text p-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                <span>Projects</span>
                <Link
                  href="/dashboard/new"
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-cyan p-0.5"
                  title="Create new project"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="flex flex-col gap-1">
                {projects.map((p) => {
                  const isActive = pathname.startsWith(`/dashboard/projects/${p.slug}`);
                  return (
                    <Link
                      key={p.id}
                      href={`/dashboard/projects/${p.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-surface-2 text-text border border-border/80"
                          : "text-muted hover:text-text hover:bg-surface-2/60"
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      <StatusDot status={p.status} />
                    </Link>
                  );
                })}

                {projects.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted/70 italic text-center">
                    No projects yet.
                  </div>
                )}

                <Link
                  href="/dashboard/new"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-2.5 py-1.5 mt-1 rounded-md text-xs font-medium text-cyan hover:bg-cyan/10 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </Link>
              </div>
            </div>

            <div>
              <div className="px-2 mb-2 text-[11px] font-mono font-medium text-muted uppercase tracking-wider">
                Overview
              </div>
              <div className="flex flex-col gap-1">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/dashboard"
                      ? "bg-surface-2 text-text border border-border/80"
                      : "text-muted hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  <FolderKanban className="w-4 h-4" />
                  <span>All Projects</span>
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors ${
                    pathname === "/dashboard/settings"
                      ? "bg-surface-2 text-text border border-border/80"
                      : "text-muted hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Account Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile and Sign Out Footer */}
        <div className="p-3 border-t border-border bg-surface-2/40 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="w-7 h-7 rounded-full bg-surface-2 border border-border shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-violet/20 border border-violet/40 text-violet flex items-center justify-center font-bold text-xs shrink-0">
                {(user.name?.[0] || "U").toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-text truncate">
                {user.name || "Developer"}
              </span>
              <span className="text-[10px] text-muted truncate">{user.email}</span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sign out"
            className="p-1.5 rounded-md text-muted hover:text-critical hover:bg-critical/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Top Bar for Desktop */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <header className="hidden lg:flex sticky top-0 z-30 h-16 border-b border-border bg-bg/85 backdrop-blur-md px-8 items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted font-mono">
            <Link href="/dashboard" className="hover:text-text">
              dashboard
            </Link>
            {pathParts.slice(1).map((part, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-muted/50" />
                <span className={idx === pathParts.length - 2 ? "text-text font-semibold" : ""}>
                  {part}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-xs text-muted hover:text-text font-medium transition-colors"
            >
              Docs
            </Link>
            <Link href="/dashboard/new">
              <button className="h-8 px-3 rounded-md bg-gradient-to-r from-cyan to-violet text-bg font-semibold text-xs flex items-center gap-1.5 hover:opacity-95 glow-primary transition-opacity">
                <Plus className="w-3.5 h-3.5" />
                <span>New Project</span>
              </button>
            </Link>
          </div>
        </header>
      </div>
    </>
  );
}

