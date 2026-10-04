"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase } from "lucide-react";

export default function AgentSignupPage() {
  const [fullName, setFullName] = useState("");
  const [nrc, setNrc] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError("Full name is required"); return; }
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); setLoading(false); return; }
    if (!authData.user) { setError("Account creation failed. Please try again."); setLoading(false); return; }

    // 2. Create sales agent profile
    const { error: agentError } = await supabase.from("sales_agents").insert({
      user_id: authData.user.id,
      full_name: fullName.trim(),
      nrc_number: nrc.trim() || null,
      phone: phone.trim() || null,
      address: address.trim() || null,
      email: email.trim(),
      contract_signed_at: new Date().toISOString(),
    });

    if (agentError) {
      setError(`Account created but agent profile failed: ${agentError.message}`);
      setLoading(false);
      return;
    }

    router.push("/agent");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-3 rounded-xl">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Sales Agent Sign Up</CardTitle>
          <CardDescription>
            Create your ElevateAI sales agent account to start earning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Your full legal name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nrc">NRC Number</Label>
              <Input
                id="nrc"
                placeholder="123456/78/9"
                value={nrc}
                onChange={(e) => setNrc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+260971234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Lusaka, Zambia"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account…" : "Create Agent Account"}
            </Button>

            <p className="text-xs text-center text-slate-400">
              By signing up you agree to the terms of the Independent Sales Agent Agreement provided by ElevateAI.
            </p>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
