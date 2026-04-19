"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  KeyRound,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SecuritySettingsForm() {
  return (
    <Card className="p-6 bg-white">
      <div className="flex items-start gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
          <Shield className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-base">Security Settings</h3>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your password, sessions, and account security.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ChangePasswordSection />
        <hr />
        <SessionsSection />
        <hr />
        <DangerZoneSection />
      </div>
    </Card>
  );
}

/* ── Change password ─────────────────────────────────────────── */
function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOpen(false);
      setTimeout(() => setSuccess(false), 4000);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-3">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-800">Change password</p>
            <p className="text-xs text-slate-500">Update your account password</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {success && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {open ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 pl-7">
          <div className="space-y-1.5">
            <Label htmlFor="new_password">New password</Label>
            <div className="relative">
              <Input
                id="new_password"
                type={showNew ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <Input
              id="confirm_password"
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Update password"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setOpen(false); setError(null); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ── Sessions ────────────────────────────────────────────────── */
function SessionsSection() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOutAll = async () => {
    if (!confirm("This will sign you out of all devices including this one. Continue?")) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signOut({ scope: "global" });
    if (err) {
      setError(err.message);
      setLoading(false);
    } else {
      setDone(true);
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <LogOut className="w-4 h-4 text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-800">Active sessions</p>
          <p className="text-xs text-slate-500">
            Sign out of all devices — including this one
          </p>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOutAll}
        disabled={loading || done}
        className="shrink-0 text-slate-700"
      >
        {loading ? "Signing out..." : "Sign out everywhere"}
      </Button>
    </div>
  );
}

/* ── Danger zone ─────────────────────────────────────────────── */
function DangerZoneSection() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== "DELETE") return;
    setLoading(true);
    setError(null);
    // In production: call a server action / edge function to delete the account.
    // Supabase doesn't allow users to delete themselves via the client SDK.
    // For now we send them a support prompt.
    setLoading(false);
    setError(null);
    alert("To permanently delete your account, please email support@yourdomain.com from your registered address.");
    setOpen(false);
    setConfirmText("");
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trash2 className="w-4 h-4 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-600">Delete account</p>
            <p className="text-xs text-slate-500">
              Permanently remove your restaurant and all data. This cannot be undone.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 border-red-200 text-red-600 hover:bg-red-50"
        >
          Delete account
        </Button>
      </div>

      {open && (
        <form onSubmit={handleDelete} className="mt-4 pl-7 space-y-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
            This will permanently delete your restaurant profile, all customers, visits, and campaigns. <strong>There is no way to undo this.</strong>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_delete" className="text-sm text-slate-700">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              id="confirm_delete"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="max-w-xs"
            />
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" /> {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={confirmText !== "DELETE" || loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Deleting..." : "Permanently delete"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => { setOpen(false); setConfirmText(""); }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
