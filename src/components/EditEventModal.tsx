"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import type { Activity } from "@/lib/types";

type EditEventModalProps = {
  open: boolean;
  onClose: () => void;
  activity: Activity;
  submitting?: boolean;
  onSubmit: (input: {
    title: string;
    locationName: string;
    description: string;
    priceRange: string;
  }) => Promise<void> | void;
};

export function EditEventModal(props: EditEventModalProps) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Edit the event"
      description="Change the plan itself. You'll share the update with the group next."
    >
      {props.open && <EventForm {...props} />}
    </Modal>
  );
}

function EventForm({ activity, submitting, onSubmit }: EditEventModalProps) {
  const [title, setTitle] = React.useState(activity.title);
  const [locationName, setLocationName] = React.useState(activity.locationName);
  const [description, setDescription] = React.useState(activity.description);
  const [priceRange, setPriceRange] = React.useState(activity.priceRange);

  const valid = title.trim().length > 0 && locationName.trim().length > 0;
  const changed =
    title !== activity.title ||
    locationName !== activity.locationName ||
    description !== activity.description ||
    priceRange !== activity.priceRange;

  const submit = () => {
    if (!valid) return;
    onSubmit({
      title: title.trim(),
      locationName: locationName.trim(),
      description: description.trim(),
      priceRange: priceRange.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          What are we doing?
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Rooftop drinks"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Where?
        </label>
        <Input
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          placeholder="e.g. Canvas, Amsterdam"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Details (optional)
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Anything the group should know"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-foreground">
          Price (optional)
        </label>
        <Input
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          placeholder="e.g. €€"
        />
      </div>

      <Button
        onClick={submit}
        disabled={!valid || !changed || submitting}
        className="w-full"
      >
        {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
        Update &amp; share
      </Button>
    </div>
  );
}
