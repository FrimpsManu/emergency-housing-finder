import { useMemo, useEffect, useState } from "react";
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

// Helper to calculate distance between two points
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();

  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);

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

  const reasonText = useMemo(() => {
    const reasons: string[] = [];
    if (filters.helpNow) reasons.push("Help Now mode");
    if (filters.urgent) reasons.push("Urgent");
    if (filters.noId) reasons.push("No ID");
    if (filters.family) reasons.push("Family");
    if (filters.freeOnly) reasons.push("Free only");
    return reasons.length ? reasons.join(" + ") : "your location";
  }, [filters.helpNow, filters.urgent, filters.noId, filters.family, filters.freeOnly]);

  // Fetch housing resources when component mounts
  useEffect(() => {
    async function fetchShelters() {
      const locationParam = filters.location.trim();
      
      if (!locationParam) {
        setLoading(false);
        setShelters([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        let lat: string;
        let lng: string;

        // Check if location is in "lat,lng" format or address string
        if (locationParam.includes(',')) {
          const parts = locationParam.split(',');
          if (!isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
            lat = parts[0].trim();
            lng = parts[1].trim();
          } else {
            const stored = localStorage.getItem("detectedLocation");
            if (stored) {
              const parsed = JSON.parse(stored);
              lat = parsed.lat;
              lng = parsed.lng;
            } else {
              throw new Error("Could not determine coordinates");
            }
          }
        } else {
          const stored = localStorage.getItem("detectedLocation");
          if (stored) {
            const parsed = JSON.parse(stored);
            lat = parsed.lat;
            lng = parsed.lng;
          } else {
            throw new Error("Could not determine coordinates");
          }
        }

        setUserLat(parseFloat(lat));
        setUserLng(parseFloat(lng));

        const location = {
          lat,
          lng,
          radius: "10"
        };

        const data = await HousingResources(location);
        setShelters(data.slice(0, 2));
      } catch (err: any) {
        console.error("Failed to fetch shelters:", err);
        
        if (err.response?.status === 429) {
          setError("Too many requests. Please wait a moment and try again.");
        } else if (err.message === "Could not determine coordinates") {
          setError("Could not determine location. Please try entering your location again.");
        } else {
          setError("Unable to load housing options. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchShelters();
  }, [filters.location]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Options near you</h1>
        <p className="mt-1 text-sm text-gray-600">
          {filters.location || "No location set"}
        </p>
      </div>

      {/* Help Now: show fast actions at the top */}
      {filters.helpNow && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-900">I need help right now</p>
          <p className="text-sm text-gray-600">
            If you can't find a match quickly, calling is often the fastest path.
          </p>

          <div className="space-y-2">
            <a
              href="tel:211"
              className="block h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
            >
              Call 211 for housing help
            </a>
            <a
              href="tel:988"
              className="block h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
            >
              Call 988 (crisis support)
            </a>
          </div>

          <p className="text-xs text-gray-500">
            If you're in immediate danger, call your local emergency number.
          </p>
        </div>
      )}

      {/* Active filters */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button
              key={c.key}
              onClick={() => removeChip(c.key)}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-200"
            >
              {c.label} ✕
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

      {/* Loading state */}
      {loading && hasLocation && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
            <span className="text-sm text-gray-600">Finding housing options...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && hasLocation && (
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

      {/* Shelter results */}
      {!loading && !error && hasLocation && shelters.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {shelters.length} option{shelters.length > 1 ? 's' : ''} · {reasonText}
            </p>
            <button
              onClick={() => nav("/")}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Edit
            </button>
          </div>

          {shelters.map((shelter, index) => {
            const [shelterLat, shelterLng] = shelter.location.split(',').map(parseFloat);
            const distance = userLat && userLng ? calculateDistance(userLat, userLng, shelterLat, shelterLng) : null;

            const handleDirectionsClick = () => {
              if (!shelterLat || !shelterLng || isNaN(shelterLat) || isNaN(shelterLng)) {
                alert("Unable to get directions: Invalid shelter location");
                return;
              }

              const shelterData = {
                name: shelter.name,
                lat: shelterLat.toString(),
                lng: shelterLng.toString(),
              };
              
              localStorage.setItem(`shelter-${encodeURIComponent(shelter.name)}`, JSON.stringify(shelterData));
              nav(`/directions/${encodeURIComponent(shelter.name)}`);
            };

            return (
              <div
                key={`${shelter.name}-${index}`}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
              >
                {/* Header */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-gray-900">{shelter.name}</h3>
                    {distance && (
                      <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                        {distance.toFixed(1)} mi
                      </span>
                    )}
                  </div>
                  
                  {shelter.address && (
                    <p className="text-sm text-gray-600">
                      {shelter.address}
                      {shelter.city && `, ${shelter.city}`}
                      {shelter.state && `, ${shelter.state}`}
                      {shelter.zip_code && ` ${shelter.zip_code}`}
                    </p>
                  )}
                </div>

                {/* Description */}
                {shelter.description && (
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {shelter.description}
                  </p>
                )}

                {/* Primary Action - Phone */}
                {shelter.phone_number && (
                  <a
                    href={`tel:${shelter.phone_number}`}
                    className="block h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
                  >
                    Call {shelter.phone_number}
                  </a>
                )}

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2">
                  {shelter.location && (
                    <button
                      onClick={handleDirectionsClick}
                      className="h-10 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium text-sm hover:bg-gray-50"
                    >
                      Directions
                    </button>
                  )}
                  
                  {shelter.official_website && (
                    <a
                      href={shelter.official_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 rounded-xl border border-gray-200 bg-white text-gray-900 font-medium text-sm hover:bg-gray-50 flex items-center justify-center"
                    >
                      Website
                    </a>
                  )}
                </div>

                {/* Email */}
                {shelter.email_address && (
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

      {/* No results state */}
      {!loading && !error && hasLocation && shelters.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-900">No housing options found nearby</p>
          <p className="text-sm text-gray-600">
            Try calling 211 or adjusting your filters.
          </p>
        </div>
      )}

      {/* No location state */}
      {!hasLocation && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm text-gray-700">
            Go back and enter a location to see options.
          </p>

          <button
            onClick={() => nav("/")}
            className="h-12 w-full rounded-xl bg-gray-900 text-white font-semibold"
          >
            Add location
          </button>
        </div>
      )}

      {/* Emergency fallback (always visible) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-900">Need help right now?</p>
        <p className="text-sm text-gray-600">
          If nothing matches or you're unsure, calling a local support line is often the fastest path.
        </p>

        <div className="space-y-2">
          <a
            href="tel:211"
            className="block h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Call 211 for housing help
          </a>
          <a
            href="tel:988"
            className="block h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
          >
            Call 988 (crisis support)
          </a>
        </div>

        <p className="text-xs text-gray-500">
          If you're in immediate danger, call your local emergency number.
        </p>
      </div>
    </div>
  );
}