"use client";

import * as React from "react";
import { Loader2, CalendarClock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Activity } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/utils";

type DateTimeProposalModalProps = {
  open: boolean;
  onClose: () => void;
  activity: Activity;
  submitting?: boolean;
  onSubmit: (input: {
    proposedStart: string;
    proposedEnd: string;
    message: string | null;
  }) => Promise<void> | void;
};

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toTimeInputValue(date: Date): string {
  const h = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${h}:${min}`;
}

export function DateTimeProposalModal(props: DateTimeProposalModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Suggest a new date or time"
      description="Pick what works for you. The host can approve it with one tap."
    >
      {/* Inner form unmounts on close, so its state resets automatically. */}
      <ProposalForm {...props} />
    </Modal>
  );
}

function ProposalForm({
  activity,
  submitting,
  onSubmit,
}: DateTimeProposalModalProps) {
  const originalStart = React.useMemo(
    () => new Date(activity.startTime),
    [activity.startTime]
  );
  const durationMs = React.useMemo(() => {
    const ms =
      new Date(activity.endTime).getTime() -
      new Date(activity.startTime).getTime();
    return Number.isFinite(ms) && ms > 0 ? ms : 60 * 60 * 1000;
  }, [activity.startTime, activity.endTime]);

  const [date, setDate] = React.useState(() => toDateInputValue(originalStart));
  const [time, setTime] = React.useState(() => toTimeInputValue(originalStart));
  const [note, setNote] = React.useState("");

  const proposedStart = date && time ? new Date(`${date}T${time}`) : null;
  const valid =
    proposedStart !== null && !Number.isNaN(proposedStart.getTime());
  const changed =
    valid && proposedStart!.getTime() !== originalStart.getTime();

  const submit = () => {
    if (!valid) return;
    const proposedEnd = new Date(proposedStart!.getTime() + durationMs);
    onSubmit({
      proposedStart: proposedStart!.toISOString(),
      proposedEnd: proposedEnd.toISOString(),
      message: note.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-foreground">
            Time
          </label>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
      </div>

      {valid && (
        <div className="flex items-center gap-2 rounded-2xl bg-primary-soft px-4 py-3 text-sm font-semibold text-primary">
          <CalendarClock className="h-4 w-4 shrink-0" />
          {formatDay(proposedStart!)} · {formatTime(proposedStart!)}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Add a note (optional)
        </label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="e.g. I can't do Saturday — would Sunday work?"
        />
      </div>

      <Button
        onClick={submit}
        disabled={!valid || !changed || submitting}
        className="w-full"
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        {changed ? "Send suggestion" : "Pick a different date or time"}
      </Button>
    </div>
  );
}
