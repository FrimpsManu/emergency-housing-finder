import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
    // Don’t show helpNow as a removable chip (it’s a mode)
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Options near you</h1>
          <p className="mt-1 text-sm text-gray-600">
            Location:{" "}
            <span className="font-medium text-gray-800">
              {filters.location || "—"}
            </span>
          </p>
        </div>

        <button
          onClick={() => nav("/")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
      </div>

      {/* Help Now: show fast actions at the top */}
      {filters.helpNow && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
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

          <p className="text-xs text-gray-500">
            If you’re in immediate danger, call your local emergency number.
          </p>
        </div>
      )}

      {/* demo banner */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <p className="text-xs text-gray-700">
          Demo mode: sample resources will be replaced with verified 211 data.
        </p>
      </div>

      {/* Active filters */}
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
            className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Placeholder + Demo CTA */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm text-gray-700">
          {hasLocation
            ? "Results will appear here once housing data is loaded."
            : "Go back and enter a location to see options."}
        </p>

        <div className="flex flex-col gap-2">
          {!hasLocation ? (
            <button
              onClick={() => nav("/")}
              className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
            >
              Add location
            </button>
          ) : (
            <>
              <button
                onClick={() => nav("/resource/sample-1")}
                className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
              >
                View sample resource (demo)
              </button>

              <button
                onClick={() => nav("/")}
                className="h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
              >
                Edit search
              </button>
            </>
          )}
        </div>
      </div>

      {/* Emergency fallback (always visible) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">Need help right now?</p>
        <p className="text-sm text-gray-600">
          If nothing matches or you’re unsure, calling a local support line is often the fastest
          path.
        </p>
        <p className="text-xs text-gray-500">
          If you’re in immediate danger, call your local emergency number.
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
    </div>
  );
}
