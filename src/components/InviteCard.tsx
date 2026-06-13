"use client";

import { MapPin, Calendar, Clock, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Activity } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/utils";

type InviteCardProps = {
  activity: Activity;
  children?: React.ReactNode;
};

export function InviteCard({ activity, children }: InviteCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col items-center gap-2 bg-accent-soft px-6 py-8 text-center">
        <span className="text-5xl" aria-hidden>
          {activity.emoji}
        </span>
        <h2 className="text-2xl font-extrabold text-foreground">
          {activity.title}
        </h2>
        <p className="flex items-center gap-1 text-muted">
          <MapPin className="h-4 w-4" />
          {activity.locationName}
        </p>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat icon={<Calendar className="h-4 w-4" />} label={formatDay(activity.startTime)} />
          <Stat icon={<Clock className="h-4 w-4" />} label={formatTime(activity.startTime)} />
          <Stat icon={<Wallet className="h-4 w-4" />} label={activity.priceRange} />
        </div>

        <p className="text-center text-sm leading-relaxed text-muted">
          {activity.description}
        </p>

        <div className="flex flex-wrap justify-center gap-1.5">
          {activity.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>

        {children}
      </div>
    </Card>
  );
}

function Stat({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-background px-2 py-3">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  );
}
