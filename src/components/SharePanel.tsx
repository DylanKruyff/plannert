"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, ThumbsUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildShareText, buildWhatsappUrl } from "@/lib/share";
import type { Activity } from "@/lib/types";

type SharePanelProps = {
  activity: Activity;
  inviteUrl: string;
  /** Headline shown above the share controls. */
  title?: string;
};

/**
 * The share surface used after a plan is created or edited. All negotiation
 * happens in the chat, so this nudges people to thumbs-up and explains that the
 * link is for anyone who needs to change the plan.
 */
export function SharePanel({
  activity,
  inviteUrl,
  title = "Share your plan",
}: SharePanelProps) {
  const [copied, setCopied] = useState(false);

  const shareText = inviteUrl ? buildShareText(activity, inviteUrl) : "";

  const copy = async () => {
    if (!shareText) return;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const whatsappUrl = inviteUrl ? buildWhatsappUrl(activity, inviteUrl) : "#";

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <p className="text-sm font-semibold text-foreground">{title}</p>

        <div className="flex items-start gap-2 rounded-2xl border border-border bg-background px-3 py-2">
          <pre className="flex-1 overflow-hidden whitespace-pre-wrap wrap-break-word font-sans text-sm text-muted">
            {shareText || "…"}
          </pre>
          <Button onClick={copy} variant="soft" size="sm" className="shrink-0">
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy
              </>
            )}
          </Button>
        </div>

        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="primary" className="w-full">
            <MessageCircle className="h-5 w-5" />
            Share on WhatsApp
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
