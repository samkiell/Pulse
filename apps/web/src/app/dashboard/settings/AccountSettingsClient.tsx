"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { RelativeTime } from "@/components/ui/RelativeTime";
import { useToast } from "@/components/ui/Toast";
import {
  User as UserIcon,
  Send,
  LogOut,
  Trash2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

export interface AccountTelegramChat {
  id: string;
  chatId: string | null;
  chatTitle: string | null;
  createdAt: Date | string;
  projectName: string;
  projectSlug: string;
}

export function AccountSettingsClient({
  user,
  chats,
}: {
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
  chats: AccountTelegramChat[];
}) {
  const { toast } = useToast();
  const [chatList, setChatList] = useState(chats);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const expectedUsername = (user.name || user.email?.split("@")[0] || "delete").trim();

  const handleUnlinkChat = async (slug: string, integrationId: string) => {
    try {
      const res = await fetch(`/api/projects/${slug}/telegram?id=${integrationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to unlink chat");
      setChatList((prev) => prev.filter((c) => c.id !== integrationId));
      toast("Chat unlinked successfully", "success");
    } catch (err: any) {
      toast(err.message || "Failed to unlink chat", "error");
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmUsername: confirmInput }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account");
      }

      toast("Account deleted. Signing out...", "success");
      signOut({ callbackUrl: "/" });
    } catch (err: any) {
      toast(err.message || "Error deleting account", "error");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text">
          Account Settings
        </h1>
        <p className="text-xs text-muted mt-1">
          Manage your developer profile, linked alert destinations, and account lifecycle
        </p>
      </div>

      {/* GitHub Profile (Read Only) */}
      <Card>
        <CardHeader
          title="Developer Profile"
          description="Authenticated via GitHub OAuth. Read-only."
        />
        <div className="flex items-center gap-4 pt-2">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-14 h-14 rounded-full border border-border"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted">
              <UserIcon className="w-6 h-6" />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-text">{user.name || "GitHub Developer"}</span>
            <span className="text-xs font-mono text-muted">{user.email || "No public email"}</span>
            <span className="text-[11px] font-mono text-muted/70">ID: {user.id}</span>
          </div>
        </div>
      </Card>

      {/* Linked Telegram Chats across Projects */}
      <Card>
        <CardHeader
          title="Linked Telegram Chats"
          description="All active chat and group subscriptions across your projects."
        />

        {chatList.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted border border-dashed border-border rounded-md">
            No Telegram chats linked yet. Link a chat from any project&apos;s Alerts tab.
          </div>
        ) : (
          <div className="divide-y divide-border border border-border rounded-md overflow-hidden bg-surface">
            {chatList.map((chat) => (
              <div
                key={chat.id}
                className="flex items-center justify-between p-3.5 text-xs gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#2AABEE]/15 text-[#2AABEE] flex items-center justify-center shrink-0">
                    <Send className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-text truncate">
                      {chat.chatTitle || "Telegram Chat"}
                    </span>
                    <span className="text-[11px] font-mono text-muted">
                      Project: {chat.projectName} (<code>{chat.projectSlug}</code>) • Linked <RelativeTime date={chat.createdAt} />
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnlinkChat(chat.projectSlug, chat.id)}
                  className="text-critical hover:bg-critical/10"
                >
                  Unlink
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Session Actions */}
      <Card>
        <CardHeader
          title="Session"
          description="Sign out from your active session on this device."
        />
        <div className="pt-1">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </Card>

      {/* Danger Zone: Delete Account */}
      <Card className="border-critical/30 bg-critical/5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-critical">
            <AlertTriangle className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Danger Zone: Delete Account</h3>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Permanently delete your user account and all associated projects, hashed API keys, incidents, error events, and Telegram subscriptions. This action is irreversible.
          </p>
          <div className="pt-2">
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmInput("");
                setDeleteModalOpen(true);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Account</span>
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={deleteModalOpen}
        title="Delete User Account"
        description="Are you absolutely sure? This will immediately delete all your projects, API keys, error history, and unbind Telegram integrations. This cannot be undone."
        confirmText="Permanently Delete Account"
        confirmVariant="danger"
        confirmMatchText={expectedUsername}
        matchValue={confirmInput}
        onMatchValueChange={setConfirmInput}
        onConfirm={handleDeleteAccount}
        onCancel={() => setDeleteModalOpen(false)}
        isLoading={deleting}
      />
    </div>
  );
}

