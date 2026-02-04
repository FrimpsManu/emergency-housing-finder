import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type Location = {
  lat: string;
  lng: string;
  radius: string;
};

export default function Home() {
  const navigate = useNavigate();

  // Location detection - initialize from localStorage if available
  const [detectedLocation, setDetectedLocation] = useState<Location | null>(() => {
    const savedLocation = localStorage.getItem("detectedLocation");
    if (savedLocation) {
      try {
        return JSON.parse(savedLocation);
      } catch (e) {
        console.error("Failed to parse saved location:", e);
        return null;
      }
    }
    return null;
  });
  
  const [locationStatus, setLocationStatus] = useState<"loading" | "success" | "error">(() => {
    // If we have a saved location, start in success state
    const savedLocation = localStorage.getItem("detectedLocation");
    return savedLocation ? "success" : "loading";
  });

  // Manual location input
  const [manualLocation, setManualLocation] = useState("");

  // Filters
  const [urgent, setUrgent] = useState(false);
  const [noId, setNoId] = useState(false);
  const [family, setFamily] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  function getUserLocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
  }

  function refreshLocation() {
    setLocationStatus("loading");
    getUserLocation()
      .then((position) => {
        console.log("User position:", position);
        const location: Location = {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
          radius: "10", // miles
        };

        setDetectedLocation(location);
        setLocationStatus("success");
        localStorage.setItem("detectedLocation", JSON.stringify(location));
      })
      .catch((error) => {
        console.error("Error getting user location:", error);
        setLocationStatus("error");
      });
  }

  useEffect(() => {
    // Only query if we don't already have a location
    if (detectedLocation) {
      return;
    }

    getUserLocation()
      .then((position) => {
        console.log("User position:", position);
        const location: Location = {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
          radius: "10", // miles
        };

        setDetectedLocation(location);
        setLocationStatus("success");
        // Save to localStorage for future visits
        localStorage.setItem("detectedLocation", JSON.stringify(location));
      })
      .catch((error) => {
        console.error("Error getting user location:", error);
        setLocationStatus("error");
      });
  }, [detectedLocation]);

  function handleSearch() {
    // Use detected location if available and manual input is empty
    const locationParam = manualLocation.trim()
      ? manualLocation
      : detectedLocation
      ? `${detectedLocation.lat},${detectedLocation.lng}`
      : "";

    if (!locationParam) {
      return; // Don't navigate if no location
    }

    navigate(
      `/results?location=${encodeURIComponent(locationParam)}&urgent=${urgent}&noId=${noId}&family=${family}&freeOnly=${freeOnly}`
    );
  }

  const hasValidLocation = manualLocation.trim() || detectedLocation !== null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Find emergency housing you qualify for
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Answer a few questions to see options worth calling.
        </p>
      </div>

      {/* Location Section */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <label className="text-sm font-medium text-gray-700">Location</label>

        {/* Auto-detected location status */}
        {locationStatus === "loading" && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
            <span className="text-sm text-gray-600">Detecting your location...</span>
          </div>
        )}

        {locationStatus === "success" && !manualLocation && (
          <div className="rounded-xl bg-gray-900 px-3 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">
                ✓ Using your current location
              </p>
              <button
                onClick={refreshLocation}
                className="text-xs text-white underline hover:text-gray-300"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {locationStatus === "error" && !manualLocation && (
          <div className="rounded-xl border border-gray-200 px-3 py-3">
            <p className="text-sm text-gray-800">
              Unable to detect location. Please enter manually below.
            </p>
          </div>
        )}

        {/* Manual location input - always visible */}
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Or enter city or ZIP"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <p className="text-xs text-gray-500">
            {detectedLocation && !manualLocation
              ? "Your location was detected automatically, or enter manually to override."
              : "Use your current city or ZIP code."}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-700">Your situation</p>

        <FilterRow
          label="I need housing urgently"
          checked={urgent}
          onChange={setUrgent}
        />
        <FilterRow
          label="I don't have ID"
          checked={noId}
          onChange={setNoId}
        />
        <FilterRow
          label="I am with family"
          checked={family}
          onChange={setFamily}
        />
        <FilterRow
          label="I need free housing"
          checked={freeOnly}
          onChange={setFreeOnly}
        />
      </div>

      {/* CTA */}
      <button
        onClick={handleSearch}
        disabled={!hasValidLocation}
        className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Find Housing
      </button>
    </div>
  );
}

function FilterRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left transition",
        checked
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
      ].join(" ")}
    >
      <span className="text-sm font-medium">{label}</span>
      <span
        className={[
          "h-6 w-11 rounded-full p-1 transition",
          checked ? "bg-white/20" : "bg-gray-100",
        ].join(" ")}
        aria-hidden
      >
        <span
          className={[
            "block h-4 w-4 rounded-full bg-white transition",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
