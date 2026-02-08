import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Add type declarations for Google Maps
declare global {
  interface Window {
    google: any;
  }
}

type Location = {
  lat: string;
  lng: string;
  radius: string;
};

async function fetchDisasterNews(lat: string, lng: string) {
  try {
    const response = await fetch(
      `/api/news?lat=${lat}&lng=${lng}`
    );
    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Error fetching disaster news:", error);
  }
}

export default function Home() {
  const navigate = useNavigate();

  // Crisis-first mode
  const [helpNow, setHelpNow] = useState(false);

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
    const savedLocation = localStorage.getItem("detectedLocation");
    return savedLocation ? "success" : "loading";
  });

  // Manual location input
  const [manualLocation, setManualLocation] = useState("");
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

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
        const location: Location = {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
          radius: "10",
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

  // Effect 1: Get user location on first mount and load Google Maps
  useEffect(() => {
    // Load Google Maps API with proper async loading
    const loadGoogleMapsScript = () => {
      // Already fully loaded
      if (window.google?.maps) return;
      
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
      if (existingScript) {
        // Script exists but may still be loading, wait for it
        return;
      }
      
      const script = document.createElement('script');
      // ✅ Use new Places API with loading=async parameter
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_MAPS_API}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      script.onerror = (error) => {
        console.error('Failed to load Google Maps script:', error);
      };
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
    
    // Only get location if not already saved
    if (detectedLocation) return;

    getUserLocation()
      .then((position) => {
        const location: Location = {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
          radius: "10",
        };

        setDetectedLocation(location);
        setLocationStatus("success");
        localStorage.setItem("detectedLocation", JSON.stringify(location));
      })
      .catch((error) => {
        console.error("Error getting user location:", error);
        setLocationStatus("error");
      });
  }, []); // Empty array - only run once on mount

  // Effect 2: Fetch disaster news when location changes
  // useEffect(() => {
  //   if (detectedLocation) {
  //     fetchDisasterNews(detectedLocation.lat, detectedLocation.lng)
  //       .then(data => {
  //         console.log("Disaster news:", data);
  //       });
  //   }
  // }, [detectedLocation]); // Runs when detectedLocation changes

  // Effect 3: Initialize Google Places Autocomplete (using new recommended API)
  useEffect(() => {
    const initializeAutocomplete = async () => {
      if (!autocompleteInputRef.current) return;
      
      // Wait for Google Maps to load
      if (!window.google?.maps) {
        setTimeout(initializeAutocomplete, 500);
        return;
      }
      
      if (autocompleteRef.current) return; // Already initialized

      try {
        // ✅ Import the new Places library (recommended as of March 2025)
        const { Place, Autocomplete } = await window.google.maps.importLibrary("places");
        
        const autocomplete = new Autocomplete(autocompleteInputRef.current, {
          fields: ['geometry', 'formatted_address', 'name'],
          types: ['geocode']
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.geometry && place.geometry.location) {
            const location: Location = {
              lat: place.geometry.location.lat().toString(),
              lng: place.geometry.location.lng().toString(),
              radius: "10"
            };
            
            setDetectedLocation(location);
            setManualLocation(place.formatted_address || place.name || '');
            localStorage.setItem("detectedLocation", JSON.stringify(location));
          }
        });

        autocompleteRef.current = autocomplete;
        console.log('✅ Google Places Autocomplete initialized (new importLibrary API)');
      } catch (error) {
        console.error('❌ Error with new API, trying legacy:', error);
        
        // Fallback to legacy API if importLibrary not available
        try {
          if (!window.google?.maps?.places) {
            throw new Error('Places library not loaded');
          }
          
          const autocomplete = new window.google.maps.places.Autocomplete(
            autocompleteInputRef.current,
            {
              types: ['geocode'],
              fields: ['geometry', 'formatted_address', 'name']
            }
          );

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place.geometry && place.geometry.location) {
              const location: Location = {
                lat: place.geometry.location.lat().toString(),
                lng: place.geometry.location.lng().toString(),
                radius: "10"
              };
              
              setDetectedLocation(location);
              setManualLocation(place.formatted_address || place.name || '');
              localStorage.setItem("detectedLocation", JSON.stringify(location));
            }
          });

          autocompleteRef.current = autocomplete;
          console.log('✅ Google Places Autocomplete initialized (legacy API)');
        } catch (fallbackError) {
          console.error('❌ Both new and legacy API failed:', fallbackError);
        }
      }
    };

    const timer = setTimeout(initializeAutocomplete, 100);
    
    return () => {
      clearTimeout(timer);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);
  
  function handleSearch() {
    const locationParam = manualLocation.trim()
      ? manualLocation
      : detectedLocation
      ? `${detectedLocation.lat},${detectedLocation.lng}`
      : "";

    if (!locationParam) return;

    navigate(
      `/results?location=${encodeURIComponent(locationParam)}&helpNow=${helpNow}&urgent=${urgent}&noId=${noId}&family=${family}&freeOnly=${freeOnly}`
    );
  }

  const hasValidLocation = manualLocation.trim() || detectedLocation !== null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div role="heading" aria-level={1}>
        <h1 className="text-2xl font-semibold text-gray-900">
          Find emergency housing you qualify for
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Answer a few questions to see options worth calling.
        </p>
      </div>

      {/* Crisis-first toggle */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900" id="help-now-label">
              I need help right now
            </p>
            <p className="mt-1 text-sm text-gray-600">
              We'll keep it simple and prioritize speed.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setHelpNow((v) => !v)}
            className={[
              "h-10 px-3 rounded-xl border text-sm font-medium transition",
              helpNow
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
            role="switch"
            aria-checked={helpNow}
            aria-labelledby="help-now-label"
          >
            {helpNow ? "On" : "Off"}
          </button>
        </div>

        {helpNow && (
          <div 
            className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700"
            role="alert"
            aria-live="polite"
          >
            If you're in immediate danger, call your local emergency number.
          </div>
        )}
      </div>

      {/* Location Section */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <label className="text-sm font-medium text-gray-700" htmlFor="location-input">
          Location
        </label>

        {locationStatus === "loading" && (
          <div 
            className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3"
            role="status"
            aria-live="polite"
          >
            <div 
              className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
              aria-hidden="true"
            ></div>
            <span className="text-sm text-gray-600">Detecting your location...</span>
          </div>
        )}

        {locationStatus === "success" && !manualLocation && (
          <div 
            className="rounded-xl bg-gray-900 px-3 py-3"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-white">
                <span aria-hidden="true">✓ </span>
                Using your current location
              </p>
              <button
                onClick={refreshLocation}
                className="text-xs text-white underline hover:text-gray-300"
                aria-label="Refresh current location"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {locationStatus === "error" && !manualLocation && (
          <div 
            className="rounded-xl border border-gray-200 px-3 py-3"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-gray-800">
              Unable to detect location. Please enter manually below.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <input
            ref={autocompleteInputRef}
            type="text"
            id="location-input"
            placeholder="Or enter city, address, or ZIP"
            value={manualLocation}
            onChange={(e) => setManualLocation(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            autoComplete="off"
            inputMode="text"
            aria-describedby="location-hint"
          />
          <p id="location-hint" className="text-xs text-gray-500">
            {detectedLocation && !manualLocation
              ? "Your location was detected automatically, or enter manually to override."
              : "Start typing to search for any city, address, or ZIP code."}
          </p>
        </div>
      </div>

      {/* Filters */}
      {!helpNow ? (
        <fieldset className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <legend className="text-sm font-medium text-gray-700">Your situation</legend>

          <FilterRow label="I need housing urgently" checked={urgent} onChange={setUrgent} />
          <FilterRow label="I don't have ID" checked={noId} onChange={setNoId} />
          <FilterRow label="I am with family" checked={family} onChange={setFamily} />
          <FilterRow label="I need free housing" checked={freeOnly} onChange={setFreeOnly} />
        </fieldset>
      ) : (
        <fieldset className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <legend className="text-sm font-medium text-gray-700">Quick options</legend>
          <FilterRow label="I don't have ID" checked={noId} onChange={setNoId} />
          <FilterRow label="I am with family" checked={family} onChange={setFamily} />
        </fieldset>
      )}

      {/* CTA */}
      <button
        onClick={handleSearch}
        disabled={!hasValidLocation}
        className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        aria-disabled={!hasValidLocation}
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
  const id = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  
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
      role="switch"
      aria-checked={checked}
      aria-labelledby={id}
    >
      <span id={id} className="text-sm font-medium">{label}</span>
      <span
        className={[
          "h-6 w-11 rounded-full p-1 transition",
          checked ? "bg-white/20" : "bg-gray-100",
        ].join(" ")}
        aria-hidden="true"
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