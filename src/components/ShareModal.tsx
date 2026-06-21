"use client";

import { PartyPopper } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ShareControls } from "@/components/SharePanel";
import type { Activity } from "@/lib/types";

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  activity: Activity;
  inviteUrl: string;
};

/**
 * Pops up right after someone changes a plan. Editing only saves the change for
 * them — the group sees nothing until they share — so this makes that final,
 * required step impossible to miss.
 */
export function ShareModal({
  open,
  onClose,
  activity,
  inviteUrl,
}: ShareModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Plan updated — now share it"
      description="The group won't see your change until you send the updated plan back to the chat."
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-4 text-primary">
          <PartyPopper className="h-6 w-6 shrink-0" />
          <p className="text-sm font-semibold">
            You&apos;re the one sharing now — drop the link in so everyone&apos;s
            on the new plan.
          </p>
        </div>
        <ShareControls activity={activity} inviteUrl={inviteUrl} />
      </div>
    </Modal>
  );
}
