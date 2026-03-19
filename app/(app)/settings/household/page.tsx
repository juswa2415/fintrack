"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Users, Mail, Crown, Trash2, Copy } from "lucide-react";

interface Member {
  id: string; role: string; joinedAt: string;
  user: { id: string; name: string; email: string };
}
interface HouseholdData { id: string; name: string; currency: string; }

const inviteSchema = z.object({ email: z.string().email() });
type InviteData = z.infer<typeof inviteSchema>;

export default function HouseholdSettingsPage() {
  const [household, setHousehold] = useState<HouseholdData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/household");
    const json = await res.json();
    setHousehold(json.household);
    setMembers(json.members ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onInvite = async (data: InviteData) => {
    const res = await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.inviteLink) {
      setInviteLink(`${window.location.origin}${json.inviteLink}`);
    }
    reset();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Household Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your household members</p>
      </div>

      {household && (
        <Card>
          <CardHeader><CardTitle>Household Info</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{household.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Currency</span>
              <span className="font-medium text-gray-900">{household.currency}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Members ({members.length})
          </CardTitle>
          <Button size="sm" onClick={() => { setInviteLink(""); setInviteOpen(true); }}>
            <Mail className="h-4 w-4 mr-1.5" /> Invite
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-sm font-semibold text-indigo-700">{m.user.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                    <p className="text-xs text-gray-400">{m.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {m.role === "OWNER" && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <Crown className="h-3 w-3" /> Owner
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite Member">
        {!inviteLink ? (
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4">
            <Input label="Email address" type="email" placeholder="member@example.com" {...register("email")} error={errors.email?.message} />
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" loading={isSubmitting}>Generate Invite Link</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Share this link with the person you want to invite:</p>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm bg-gray-50" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4 mr-1" /> {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button className="w-full" onClick={() => { setInviteOpen(false); setInviteLink(""); }}>Done</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
