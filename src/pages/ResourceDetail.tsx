import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isSaved, saveResource, removeResource } from "../utils/savedResources";

export default function ResourceDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const resourceId = id ?? "unknown";
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(resourceId));
  }, [resourceId]);

  // Placeholder data until dataset integration
  const resource = {
    id: resourceId,
    name: "Sample Emergency Shelter",
    type: "Emergency Shelter",
    city: "Sample City",
    state: "LA",
    phone: "(555) 123-4567",
    address: "123 Main St, Sample City, LA",
    cost: "Free",
    idRequired: false,
    familyFriendly: true,
    services: ["Beds", "Meals", "Showers", "Case Management"],
    notes: "Call ahead to confirm availability. Intake hours may vary.",
    sourceName: "211 United Way",
    lastVerified: "2026-02-01",
  };

  const mapsUrl = useMemo(() => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`;
  }, [resource.address]);

  // Tel:
  const telHref = useMemo(() => {
    const cleaned = resource.phone.replace(/[^\d+]/g, "");
    return `tel:${cleaned}`;
  }, [resource.phone]);

  function toggleSave() {
    if (saved) {
      removeResource(resourceId);
      setSaved(false);
      return;
    }

    saveResource({
      id: resourceId,
      name: resource.name,
      city: resource.city,
      state: resource.state,
    });
    setSaved(true);
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>

        <button
          onClick={toggleSave}
          className={[
            "rounded-xl border px-3 py-2 text-sm font-medium transition",
            saved
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
          ].join(" ")}
        >
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      </div>

      {/* Title */}
      <div>
        <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
          {resource.type}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{resource.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {resource.city}, {resource.state}
        </p>
      </div>

      {/* Primary actions */}
      <div className="grid grid-cols-1 gap-2">
        <a
          href={telHref}
          className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
        >
          Call Now
        </a>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
        >
          Directions
        </a>
      </div>

      {/* Calling checklist (crisis-first UX) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">What to expect when you call</p>

        <p className="text-xs text-gray-600">
          Based on this listing: ID required = {resource.idRequired ? "Yes" : "No"} • Family-friendly
          = {resource.familyFriendly ? "Yes" : "No"}
        </p>

        <div className="space-y-2 text-sm text-gray-700">
          <div className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>Ask if they have space available right now (beds or family units).</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>Ask about intake hours and whether you need to arrive by a certain time.</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>Ask what documents are needed (ID, proof of residency, referral, etc.).</span>
          </div>
          <div className="flex gap-2">
            <span className="mt-0.5">•</span>
            <span>Ask if they serve your situation (families, youth, women, LGBTQ+).</span>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Availability can change quickly. If you can’t reach them, try another option or call 211 for
          the fastest referrals.
        </div>
      </div>

      {/* Key info */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">Quick details</p>

        <div className="grid grid-cols-1 gap-2">
          <InfoRow label="Cost" value={resource.cost} />
          <InfoRow label="ID required" value={resource.idRequired ? "Yes" : "No"} />
          <InfoRow label="Family friendly" value={resource.familyFriendly ? "Yes" : "No"} />
          <InfoRow label="Address" value={resource.address} />
        </div>
      </div>

      {/* Services */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">Services</p>
        <div className="flex flex-wrap gap-2">
          {resource.services.map((s) => (
            <span
              key={s}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* Notes / Safety */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
        <p className="text-sm font-medium text-gray-900">Notes</p>
        <p className="text-sm text-gray-700">{resource.notes}</p>
        <p className="text-xs text-gray-600">Availability can change — always call ahead.</p>
      </div>

      {/* Trust */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <p className="text-sm font-medium text-gray-900">Source</p>
        <p className="text-sm text-gray-700">{resource.sourceName}</p>
        <p className="text-xs text-gray-600">Last verified: {resource.lastVerified}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-100 px-3 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}
