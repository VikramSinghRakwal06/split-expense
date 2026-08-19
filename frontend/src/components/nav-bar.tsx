"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Check, Copy, LogOut, Receipt, Users } from "lucide-react";
import { getUnreadCount, logout } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserResponse } from "@/lib/types";

const LINKS = [
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function NavBar({ me }: { me: UserResponse | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getUnreadCount()
      .then((res) => {
        if (!cancelled) setUnreadCount(res.count);
      })
      .catch(() => {
        // Non-critical: the badge just stays hidden if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      // Cookies are cleared server-side regardless of whether the backend
      // call itself succeeded — see lib/server-api.ts's logout().
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/groups" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Receipt className="size-4" />
            </span>
            <span className="font-heading text-base font-semibold tracking-tight">
              SplitExpense
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  <link.icon className="size-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                  {link.href === "/notifications" && !!unreadCount && (
                    <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {me && <AccountMenu me={me} />}
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="size-4" />
            <span className="hidden sm:inline">{loggingOut ? "Signing out…" : "Sign out"}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

/**
 * Answers "where do I even find my own account id" — the id nobody used to be able to
 * see or copy, which made adding a member by id impossible unless they already knew it
 * by some other means. Invites are by email now (see AddMemberForm), so this is a
 * fallback and a bit of transparency, not the primary path.
 */
function AccountMenu({ me }: { me: UserResponse }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copyId() {
    await navigator.clipboard.writeText(me.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-accent"
      >
        <Avatar userId={me.id} name={me.fullName} />
        <span className="hidden text-sm font-medium sm:inline">{me.fullName}</span>
      </button>

      {open && (
        <>
          {/* Full-viewport backdrop so a click anywhere outside the panel closes it. */}
          <button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border bg-popover p-3 text-popover-foreground shadow-lg">
            <div className="flex items-center gap-2.5">
              <Avatar userId={me.id} name={me.fullName} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{me.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{me.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Your account id</span>
              <div className="flex items-center gap-1.5">
                <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 text-xs">
                  {me.id}
                </code>
                <Button type="button" variant="outline" size="icon-xs" onClick={copyId}>
                  {copied ? <Check className="text-success" /> : <Copy />}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Share this with anyone who wants to add you to a group by id instead of
                email.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
