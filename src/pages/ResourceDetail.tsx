import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { isSaved, saveResource, removeResource } from "../utils/savedResources";
import { RESOURCES } from "../data/resources";

export default function ResourceDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const resourceId = id ?? "unknown";

  const resource = useMemo(() => RESOURCES.find((r) => r.id === resourceId), [resourceId]);

  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isSaved(resourceId));
  }, [resourceId]);

  if (!resource) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => nav(-1)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-900">Resource not found</p>
          <p className="mt-1 text-sm text-gray-600">
            Try going back to results or call 211 for immediate help.
          </p>
          <a
            href="tel:211"
            className="mt-3 h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Call 211
          </a>
        </div>
      </div>
    );
  }

  const mapsUrl = resource.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>

        <button
          onClick={() => {
            if (saved) {
              removeResource(resourceId);
              setSaved(false);
            } else {
              saveResource({ id: resourceId, name: resource.name, city: resource.city, state: resource.state });
              setSaved(true);
            }
          }}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      </div>

      <div>
        <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
          {resource.type}
        </div>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">{resource.name}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {resource.city}, {resource.state}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <a
          href={`tel:${resource.phone}`}
          className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
        >
          Call Now
        </a>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
          >
            Directions
          </a>
        ) : (
          <div className="h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold flex items-center justify-center">
            Call for location
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">What to expect when you call</p>
        <ul className="space-y-2 text-sm text-gray-700 list-disc pl-5">
          <li>Ask if they have space available right now.</li>
          <li>Ask about intake hours and arrival deadlines.</li>
          <li>Ask what documents are needed (ID, referral, etc.).</li>
          <li>Confirm they serve your situation (families, youth, etc.).</li>
        </ul>
        <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Availability can change quickly. If you can’t reach them, try another option or call 211.
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">Quick details</p>
        <InfoRow label="Cost" value={resource.cost} />
        <InfoRow label="ID required" value={resource.idRequired ? "Yes" : "No"} />
        <InfoRow label="Family friendly" value={resource.familyFriendly ? "Yes" : "No"} />
        {resource.address && <InfoRow label="Address" value={resource.address} />}
      </div>

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
