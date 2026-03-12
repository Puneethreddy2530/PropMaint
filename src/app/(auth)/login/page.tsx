"use client";

import { useState } from "react";
import { loginAction, quickLoginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/form-elements";
import { Loader2, Shield, Wrench } from "lucide-react";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setLoading("login");
        const formData = new FormData(e.currentTarget);
        const result = await loginAction(formData);
        if (result && "error" in result) {
            setError(result.message);
            setLoading(null);
        }
    }

    async function handleQuickLogin(role: "tenant" | "manager" | "staff") {
        setError(null);
        setLoading(role);
        const result = await quickLoginAction(role);
        if (result && "error" in result) {
            setError(result.message);
            setLoading(null);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
            <div className="w-full max-w-md p-6">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-6">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight">PropMaint</h1>
                        <p className="text-sm text-muted-foreground">Property Maintenance Management</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" name="password" type="password" placeholder="••••••••" required />
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                                {error}
                            </div>
                        )}

                        <Button type="submit" className="w-full" disabled={!!loading}>
                            {loading === "login" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                        </Button>
                    </form>

                    <div className="pt-4 border-t">
                        <p className="text-xs text-muted-foreground text-center mb-3">Quick Demo Logins</p>
                        <div className="grid grid-cols-3 gap-2">
                            <Button onClick={() => handleQuickLogin("tenant")} disabled={!!loading} data-testid="login-tenant" variant="secondary">
                                {loading === "tenant" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Tenant"}
                            </Button>
                            <Button onClick={() => handleQuickLogin("manager")} disabled={!!loading} data-testid="login-manager" variant="secondary">
                                {loading === "manager" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            </Button>
                            <Button onClick={() => handleQuickLogin("staff")} disabled={!!loading} data-testid="login-staff" variant="secondary">
                                {loading === "staff" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wrench className="w-4 h-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

