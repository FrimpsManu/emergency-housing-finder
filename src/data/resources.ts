export type Resource = {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  phone: string;
  address?: string;
  cost: "Free" | "Low-cost" | "Varies";
  idRequired: boolean;
  familyFriendly: boolean;
  tags: string[];
  notes?: string;
  sourceName: string;
  lastVerified: string; // ISO date
};

export const RESOURCES: Resource[] = [
  {
    id: "sample-1",
    name: "Downtown Emergency Shelter",
    type: "Emergency Shelter",
    city: "Seattle",
    state: "WA",
    phone: "211",
    address: "123 Main St, Seattle, WA",
    cost: "Free",
    idRequired: false,
    familyFriendly: true,
    tags: ["Free", "No ID", "Family", "Meals"],
    notes: "Call ahead for intake hours and bed availability.",
    sourceName: "211 / Public Directory",
    lastVerified: "2026-02-04",
  },
  {
    id: "sample-2",
    name: "Harbor Night Shelter",
    type: "Night Shelter",
    city: "Seattle",
    state: "WA",
    phone: "(555) 222-0002",
    address: "55 Harbor Ave, Seattle, WA",
    cost: "Free",
    idRequired: true,
    familyFriendly: false,
    tags: ["Free", "Adults", "Showers"],
    notes: "ID required for intake.",
    sourceName: "211 / Public Directory",
    lastVerified: "2026-02-02",
  },
];
