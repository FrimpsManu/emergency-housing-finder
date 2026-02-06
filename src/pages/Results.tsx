import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ResourceCard from "../components/ResourceCard";
import { RESOURCES } from "../data/resources";

type Filters = {
  location: string;
  helpNow: boolean;
  urgent: boolean;
  noId: boolean;
  family: boolean;
  freeOnly: boolean;
};

function parseBool(v: string | null) {
  return v === "true";
}

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();

  const filters: Filters = useMemo(() => {
    const sp = new URLSearchParams(loc.search);
    return {
      location: sp.get("location") ?? "",
      helpNow: parseBool(sp.get("helpNow")),
      urgent: parseBool(sp.get("urgent")),
      noId: parseBool(sp.get("noId")),
      family: parseBool(sp.get("family")),
      freeOnly: parseBool(sp.get("freeOnly")),
    };
  }, [loc.search]);

  const activeChips = useMemo(() => {
    const chips: { key: keyof Filters; label: string }[] = [];
    if (filters.urgent) chips.push({ key: "urgent", label: "Urgent" });
    if (filters.noId) chips.push({ key: "noId", label: "No ID" });
    if (filters.family) chips.push({ key: "family", label: "Family" });
    if (filters.freeOnly) chips.push({ key: "freeOnly", label: "Free only" });
    return chips;
  }, [filters]);

  function removeChip(key: keyof Filters) {
    const sp = new URLSearchParams(loc.search);
    sp.set(String(key), "false");
    nav(`/results?${sp.toString()}`);
  }

  function clearFilters() {
    const sp = new URLSearchParams(loc.search);
    sp.set("urgent", "false");
    sp.set("noId", "false");
    sp.set("family", "false");
    sp.set("freeOnly", "false");
    nav(`/results?${sp.toString()}`);
  }

  const hasLocation = filters.location.trim().length > 0;

  const filtered = useMemo(() => {
    let items = [...RESOURCES];

    if (filters.freeOnly) items = items.filter((r) => r.cost === "Free");
    if (filters.noId) items = items.filter((r) => r.idRequired === false);
    if (filters.family) items = items.filter((r) => r.familyFriendly === true);

    // “Help Now” prioritization (not filtering): sort free + noID first
    if (filters.helpNow) {
      items.sort((a, b) => {
        const score = (r: typeof a) =>
          (r.cost === "Free" ? 2 : 0) + (!r.idRequired ? 2 : 0) + (r.familyFriendly ? 1 : 0);
        return score(b) - score(a);
      });
    }

    return items;
  }, [filters.freeOnly, filters.noId, filters.family, filters.helpNow]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Options near you</h1>
          <p className="mt-1 text-sm text-gray-600">
            Location: <span className="font-medium text-gray-800">{filters.location || "—"}</span>
          </p>
        </div>

        <button
          onClick={() => nav("/")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
      </div>

      {filters.helpNow && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-gray-900">Fast help</p>
          <p className="text-sm text-gray-600">
            If you can’t find a match quickly, calling is often the fastest path.
          </p>
          <div className="grid grid-cols-1 gap-2">
            <a
              href="tel:211"
              className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
            >
              Call 211 for housing help
            </a>
            <a
              href="tel:988"
              className="h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
            >
              Call 988 (crisis support)
            </a>
          </div>
        </div>
      )}

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c.key)}
              className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200"
              title="Remove filter"
            >
              {c.label} ✕
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear all
          </button>
        </div>
      )}

      {!hasLocation ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm text-gray-700">Go back and enter a location to see options.</p>
          <button
            onClick={() => nav("/")}
            className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Add location
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-900">No matches for these filters</p>
          <p className="text-sm text-gray-600">
            Try removing one filter or call 211 to get immediate referrals.
          </p>
          <a
            href="tel:211"
            className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Call 211
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const directionsUrl = r.address
              ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`
              : undefined;

            return (
              <ResourceCard
                key={r.id}
                name={r.name}
                city={r.city}
                state={r.state}
                tags={r.tags}
                phone={r.phone}
                directionsUrl={directionsUrl}
                onOpen={() => nav(`/resource/${r.id}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
