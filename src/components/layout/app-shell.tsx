"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard, Ticket, PlusCircle, Bell, User, BarChart3,
    Users, Building2, LogOut, Wrench,
} from "lucide-react";
import type { UserRole } from "@prisma/client";
import { OfflineBanner } from "./offline-banner";

interface NavItem { href: string; label: string; icon: React.ReactNode; roles: UserRole[]; }

const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["TENANT", "MANAGER", "STAFF"] },
    { href: "/tickets", label: "Tickets", icon: <Ticket className="w-5 h-5" />, roles: ["TENANT", "MANAGER", "STAFF"] },
    { href: "/tickets/new", label: "New", icon: <PlusCircle className="w-5 h-5" />, roles: ["TENANT", "MANAGER"] },
    { href: "/analytics", label: "Analytics", icon: <BarChart3 className="w-5 h-5" />, roles: ["MANAGER"] },
    { href: "/team", label: "Team", icon: <Users className="w-5 h-5" />, roles: ["MANAGER"] },
    { href: "/notifications", label: "Alerts", icon: <Bell className="w-5 h-5" />, roles: ["TENANT", "MANAGER", "STAFF"] },
];

interface AppShellProps {
    children: React.ReactNode;
    user: { id: string; name: string; email: string; role: UserRole };
    unreadCount: number;
}

export function AppShell({ children, user, unreadCount }: AppShellProps) {
    const pathname = usePathname();
    const filteredNav = navItems.filter(item => item.roles.includes(user.role));

    const roleLabel = user.role === "TENANT" ? "Tenant" : user.role === "MANAGER" ? "Manager" : "Technician";
    const roleColor = user.role === "TENANT" ? "bg-amber-100 text-amber-800"
        : user.role === "MANAGER" ? "bg-teal-100 text-teal-800"
            : "bg-blue-100 text-blue-800";

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            <div className="fixed top-0 left-0 right-0 z-[100]">
                <OfflineBanner />
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card z-30 pt-6">
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-5 border-b">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <h1 className="font-bold text-lg leading-none">PropMaint</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Maintenance Hub</p>
                        </div>
                        <ThemeToggle />
                    </div>

                    {/* User info */}
                    <div className="px-4 py-3 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                                {user.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.name}</p>
                                <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", roleColor)}>
                                    {roleLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Nav items */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {filteredNav.map(item => {
                            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                            return (
                                <Link key={item.href} href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}>
                                    {item.icon}
                                    <span>{item.label}</span>
                                    {item.href === "/notifications" && unreadCount > 0 && (
                                        <span className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                                            {unreadCount > 9 ? "9+" : unreadCount}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <div className="px-3 py-4 border-t">
                        <form action={logoutAction}>
                            <Button type="submit" variant="ghost" className="w-full justify-start gap-3 text-muted-foreground">
                                <LogOut className="w-4 h-4" /> Sign Out
                            </Button>
                        </form>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                {/* Mobile header */}
                <header className="md:hidden sticky top-0 z-20 bg-card/80 backdrop-blur-lg border-b px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                                <Building2 className="w-4 h-4" />
                            </div>
                            <span className="font-bold">PropMaint</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <Link href="/notifications" className="relative p-2">
                                <Bell className="w-5 h-5 text-muted-foreground" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Link>
                            <div className={cn("text-[10px] font-semibold px-2 py-1 rounded-full", roleColor)}>
                                {roleLabel}
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-lg border-t">
                <div className="flex items-center justify-around px-2 py-1">
                    {filteredNav.slice(0, 5).map(item => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        const isNewButton = item.href === "/tickets/new";
                        return (
                            <Link key={item.href} href={item.href}
                                className={cn(
                                    "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[56px]",
                                    isNewButton ? "" : isActive ? "text-primary" : "text-muted-foreground"
                                )}>
                                {isNewButton ? (
                                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 -mt-4">
                                        <PlusCircle className="w-5 h-5" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            {item.icon}
                                            {item.href === "/notifications" && unreadCount > 0 && (
                                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center">
                                                    {unreadCount > 9 ? "!" : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.label}</span>
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </div>
                {/* iOS safe area */}
                <div className="h-[env(safe-area-inset-bottom)]" />
            </nav>
        </div>
    );
}
