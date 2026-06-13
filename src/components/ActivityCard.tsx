"use client";

import { MapPin, Calendar, Clock, Wallet, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/types";
import { formatDay, formatTime } from "@/lib/utils";

type ActivityCardProps = {
  activity: Activity;
  onChoose?: (activity: Activity) => void;
  selecting?: boolean;
  compact?: boolean;
};

export function ActivityCard({
  activity,
  onChoose,
  selecting,
  compact,
}: ActivityCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="flex items-center gap-4 bg-accent-soft px-6 py-5">
        <span className="text-4xl" aria-hidden>
          {activity.emoji}
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold text-foreground">
            {activity.title}
          </h3>
          <p className="flex items-center gap-1 text-sm text-muted">
            <MapPin className="h-4 w-4" />
            {activity.locationName}
          </p>
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 pt-5">
        <div className="flex flex-wrap gap-2 text-sm text-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 font-medium">
            <Calendar className="h-4 w-4 text-primary" />
            {formatDay(activity.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {formatTime(activity.startTime)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 font-medium">
            <Wallet className="h-4 w-4 text-primary" />
            {activity.priceRange}
          </span>
        </div>

        {!compact && (
          <p className="text-sm leading-relaxed text-muted">
            {activity.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {activity.tags.map((tag) => (
            <Badge key={tag} variant="neutral">
              {tag}
            </Badge>
          ))}
        </div>

        {onChoose && (
          <Button
            onClick={() => onChoose(activity)}
            disabled={selecting}
            className="mt-auto w-full"
          >
            {selecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating plan…
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Choose
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
