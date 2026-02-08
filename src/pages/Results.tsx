import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import HousingResources, { type Shelter } from "../data/HousingResources";

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

// Miles between two coords
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

  // Cache results by "lat,lng,radius"
  const cacheRef = useRef(new Map<string, Shelter[]>());
  // Cooldown after rate-limit
  const retryAfterRef = useRef<number>(0);

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
  }, [filters.urgent, filters.noId, filters.family, filters.freeOnly]);

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

  const reasonText = useMemo(() => {
    const reasons: string[] = [];
    if (filters.helpNow) reasons.push("Help Now mode");
    if (filters.urgent) reasons.push("Urgent");
    if (filters.noId) reasons.push("No ID");
    if (filters.family) reasons.push("Family");
    if (filters.freeOnly) reasons.push("Free only");
    return reasons.length ? reasons.join(" + ") : "your location";
  }, [filters.helpNow, filters.urgent, filters.noId, filters.family, filters.freeOnly]);

  // Fetch from API whenever location changes
  useEffect(() => {
    let cancelled = false;

    async function fetchShelters() {
      const locationParam = filters.location.trim();

      if (!locationParam) {
        setLoading(false);
        setError(null);
        setShelters([]);
        return;
      }

      // Cooldown after 429
      const now = Date.now();
      if (now < retryAfterRef.current) {
        setLoading(false);
        setShelters([]);
        setError("Too many requests (rate limited). Please wait a moment and try again.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let lat: string;
        let lng: string;

        // If "lat,lng"
        if (locationParam.includes(",")) {
          const [aRaw, bRaw] = locationParam.split(",");
          const a = (aRaw ?? "").trim();
          const b = (bRaw ?? "").trim();

          if (!isNaN(parseFloat(a)) && !isNaN(parseFloat(b))) {
            lat = a;
            lng = b;
          } else {
            const stored = localStorage.getItem("detectedLocation");
            if (!stored) throw new Error("Could not determine coordinates");
            const parsed = JSON.parse(stored);
            lat = parsed.lat;
            lng = parsed.lng;
          }
        } else {
          // Manual text (city/zip) not geocoded yet → fallback to detectedLocation
          const stored = localStorage.getItem("detectedLocation");
          if (!stored) throw new Error("Could not determine coordinates");
          const parsed = JSON.parse(stored);
          lat = parsed.lat;
          lng = parsed.lng;
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        setUserLat(latNum);
        setUserLng(lngNum);

        const radius = "10";
        const cacheKey = `${lat},${lng},${radius}`;

        // Cache hit
        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
          if (!cancelled) setShelters(cached);
          return;
        }

        const data = await HousingResources({ lat, lng, radius });
        const next = (data ?? []).slice(0, 20);

        cacheRef.current.set(cacheKey, next);
        if (!cancelled) setShelters(next);
      } catch (err: any) {
        console.error("Failed to fetch shelters:", err);

        if (err?.response?.status === 429) {
          retryAfterRef.current = Date.now() + 30_000;
          setError("Too many requests (rate limited). Please wait 30 seconds and try again.");
        } else if (err?.message === "Could not determine coordinates") {
          setError("Could not determine location. Please go back and allow location or enter again.");
        } else {
          setError("Unable to load housing options. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchShelters();

    return () => {
      cancelled = true;
    };
  }, [filters.location]);

  // Optional: apply “helpNow” prioritization on the client (sorting only)
  const displayShelters = useMemo(() => {
    const items = [...shelters];

    // If you later have real flags, you can sort by them. For now keep original.
    // Example placeholder: prioritize shelters that have phone + address
    if (filters.helpNow) {
      items.sort((a: any, b: any) => {
        const score = (r: any) => (r?.phone_number ? 2 : 0) + (r?.address ? 1 : 0);
        return score(b) - score(a);
      });
    }
    return items;
  }, [shelters, filters.helpNow]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Options near you</h1>
          <p className="mt-1 text-sm text-gray-600">
            Location:{" "}
            <span className="font-medium text-gray-800">{filters.location || "—"}</span>
          </p>
        </div>

        <button
          onClick={() => nav("/")}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Edit
        </button>
      </div>

      {/* Help Now: fast actions */}
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

      {/* Active filters */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Active filters">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c.key)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200"
              title="Remove filter"
            >
              {c.label} <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button
            onClick={clearFilters}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            Clear all
          </button>
        </div>
      )}

      {/* If no location */}
      {!hasLocation && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm text-gray-700">Go back and enter a location to see options.</p>
          <button
            onClick={() => nav("/")}
            className="h-12 w-full rounded-xl bg-gray-900 text-white font-semibold"
          >
            Add location
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && hasLocation && (
        <div 
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
            <span className="text-sm text-gray-600">Finding housing options…</span>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && hasLocation && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm text-gray-800">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white text-gray-900 font-medium text-sm hover:bg-gray-50"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && hasLocation && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {displayShelters.length} option{displayShelters.length === 1 ? "" : "s"} · {reasonText}
            </p>
          </div>

          {displayShelters.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <p className="text-sm font-semibold text-gray-900">No housing options found nearby</p>
              <p className="text-sm text-gray-600">Try calling 211 or adjusting your filters.</p>
              <a
                href="tel:211"
                className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
              >
                Call 211
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {displayShelters.map((shelter: any, index) => {
                // Some APIs return "location" as "lat,lng"
                const [sLat, sLng] = (shelter?.location ?? "")
                  .split(",")
                  .map((x: string) => parseFloat(x.trim()));

                const distance =
                  userLat != null &&
                  userLng != null &&
                  !Number.isNaN(sLat) &&
                  !Number.isNaN(sLng)
                    ? calculateDistance(userLat, userLng, sLat, sLng)
                    : null;

                const addressLine = [
                  shelter?.address,
                  shelter?.city,
                  shelter?.state,
                  shelter?.zip_code,
                ]
                  .filter(Boolean)
                  .join(", ");

                const phone = shelter?.phone_number ?? shelter?.phone ?? "";

                const mapsUrl =
                  !Number.isNaN(sLat) && !Number.isNaN(sLng)
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${sLat},${sLng}`
                      )}`
                    : addressLine
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        addressLine
                      )}`
                    : undefined;

                return (
                  <div
                    key={`${shelter?.id ?? shelter?.name ?? "shelter"}-${index}`}
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          {shelter?.name ?? "Unknown shelter"}
                        </h3>
                        {distance != null && (
                          <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                            {distance.toFixed(1)} mi
                          </span>
                        )}
                      </div>

                      {addressLine && <p className="text-sm text-gray-600">{addressLine}</p>}
                    </div>

                    {shelter?.description && (
                      <p className="text-sm text-gray-700 leading-relaxed">{shelter.description}</p>
                    )}

                    {/* Primary action */}
                    {phone ? (
                      <a
                        href={`tel:${phone}`}
                        className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
                      >
                        Call {phone}
                      </a>
                    ) : (
                      <div className="h-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold flex items-center justify-center">
                        Call (phone not listed)
                      </div>
                    )}

                    {/* Secondary actions */}
                    <div className="grid grid-cols-2 gap-2">
                      {mapsUrl ? (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="h-10 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium text-sm hover:bg-gray-50 flex items-center justify-center"
                        >
                          Directions
                        </a>
                      ) : (
                        <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium text-sm flex items-center justify-center">
                          No map
                        </div>
                      )}

                      {shelter?.official_website ? (
                        <a
                          href={shelter.official_website}
                          target="_blank"
                          rel="noreferrer"
                          className="h-10 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium text-sm hover:bg-gray-50 flex items-center justify-center"
                        >
                          Website
                        </a>
                      ) : (
                        <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-medium text-sm flex items-center justify-center">
                          No website
                        </div>
                      )}
                    </div>

                    {shelter?.email_address && (
                      <a
                        href={`mailto:${shelter.email_address}`}
                        className="block text-sm text-gray-600 hover:text-gray-900"
                      >
                        {shelter.email_address}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Emergency fallback (always visible) */}
      <aside 
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        aria-labelledby="emergency-help-heading"
      >
        <p id="emergency-help-heading" className="text-sm font-medium text-gray-900">
          Need help right now?
        </p>
        <p className="text-sm text-gray-600">
          If nothing matches or you’re unsure, calling a local support line is often the fastest
          path.
        </p>

        <div className="space-y-2">
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
      </aside>
    </div>
  );
}
