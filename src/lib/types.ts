export type Activity = {
  id: string;
  title: string;
  emoji: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  startTime: string;
  endTime: string;
  priceRange: string;
  sourceUrl: string;
  confidenceScore: number;
  tags: string[];
};

export type SearchPreferences = {
  activityType: string | null;
  location: string | null;
  dateTimePreference: string | null;
  budget: string | null;
  groupSize: string | null;
  preferences: string[];
};

export type ActivitySearchResponse = {
  preferences: SearchPreferences;
  resolvedLocation: string;
  activities: Activity[];
  usedAi: boolean;
};

export type PlanStatus = "open" | "agreed" | "cancelled";
export type ResponseType = "accepted" | "declined" | "suggested";
export type ProposalStatus = "pending" | "allowed" | "declined";

export type ResponseRecord = {
  id: string;
  name: string;
  response: ResponseType;
  suggestion: string | null;
  createdAt: string;
};

export type TimeProposal = {
  id: string;
  name: string;
  proposedStart: string;
  proposedEnd: string;
  message: string | null;
  status: ProposalStatus;
  createdAt: string;
};

export type PlanView = {
  id: string;
  creatorId: string;
  creatorName: string;
  activity: Activity;
  status: PlanStatus;
  inviteToken: string;
  responses: ResponseRecord[];
  proposals: TimeProposal[];
  createdAt: string;
};

export type Suggestion = {
  type: "time" | "date" | "activity" | "location";
  title: string;
  detail: string;
};
