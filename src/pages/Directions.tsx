import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

type DirectionsStep = {
  instruction: string;
  distance: string;
  duration: string;
};

type DirectionsData = {
  steps: DirectionsStep[];
  totalDistance: string;
  totalDuration: string;
  startAddress: string;
  endAddress: string;
};

export default function Directions() {
  const navigate = useNavigate();
  const { shelterName } = useParams();
  
  const [directions, setDirections] = useState<DirectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [travelMode, setTravelMode] = useState<"DRIVING" | "WALKING" | "TRANSIT">("DRIVING");

  const shelterLocationKey = `shelter-${shelterName}`;
  const shelterLocation = localStorage.getItem(shelterLocationKey);
  const userLocation = localStorage.getItem("detectedLocation");

  useEffect(() => {
    async function fetchDirections() {
      if (!shelterLocation || !userLocation) {
        setError("Your location not found. We need to know your exact location to provide directions. Please go back and allow location access.");
        setLoading(false);
        return;
      }

      try {
        const shelter = JSON.parse(shelterLocation);
        const user = JSON.parse(userLocation);

        if (!user.lat || !user.lng || isNaN(parseFloat(user.lat)) || isNaN(parseFloat(user.lng))) {
          setError("Directions require precise location. Please allow location access to get turn-by-turn directions.");
          setLoading(false);
          return;
        }

        if (!window.google?.maps) {
          throw new Error("Google Maps not loaded");
        }

        const directionsService = new window.google.maps.DirectionsService();

        const request = {
          origin: { lat: parseFloat(user.lat), lng: parseFloat(user.lng) },
          destination: { lat: parseFloat(shelter.lat), lng: parseFloat(shelter.lng) },
          travelMode: window.google.maps.TravelMode[travelMode],
        };

        directionsService.route(request, (result: any, status: any) => {
          if (status === "OK" && result) {
            const route = result.routes[0];
            const leg = route.legs[0];

            const steps: DirectionsStep[] = leg.steps.map((step: any) => ({
              instruction: step.instructions.replace(/<[^>]*>/g, ''),
              distance: step.distance.text,
              duration: step.duration.text,
            }));

            setDirections({
              steps,
              totalDistance: leg.distance.text,
              totalDuration: leg.duration.text,
              startAddress: leg.start_address,
              endAddress: leg.end_address,
            });
            setLoading(false);
          } else {
            throw new Error("Failed to get directions");
          }
        });
      } catch (err) {
        console.error("Directions error:", err);
        setError("Unable to load directions");
        setLoading(false);
      }
    }

    fetchDirections();
  }, [shelterLocation, userLocation, travelMode]);

  const handleTravelModeChange = (mode: "DRIVING" | "WALKING" | "TRANSIT") => {
    setTravelMode(mode);
    setLoading(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div role="heading" aria-level={1}>
          <h1 className="text-2xl font-semibold text-gray-900">Directions</h1>
          <p className="mt-1 text-sm text-gray-600">Loading route...</p>
        </div>

        <div 
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div 
              className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"
              aria-hidden="true"
            ></div>
            <span className="text-sm text-gray-600">Loading directions...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !directions) {
    const isLocationError = error?.includes("precise location");
    
    return (
      <div className="space-y-6">
        <div role="heading" aria-level={1}>
          <h1 className="text-2xl font-semibold text-gray-900">Directions</h1>
          <p className="mt-1 text-sm text-gray-600">Unable to load route</p>
        </div>

        {isLocationError ? (
          <div 
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm font-semibold text-gray-900">Location access required</p>
            <p className="text-sm text-gray-600">
              Turn-by-turn directions require your precise GPS location. Please enable location access in your browser.
            </p>
            <button
              onClick={() => {
                navigate('/');
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }}
              className="h-12 w-full rounded-xl bg-gray-900 text-white font-semibold"
            >
              Go back and enable location
            </button>
            <p className="text-xs text-gray-500 text-center">
              Or use "Open in Google Maps" below
            </p>
          </div>
        ) : (
          <div 
            className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            role="alert"
            aria-live="assertive"
          >
            <p className="text-sm text-gray-800">{error || "Unable to load directions"}</p>
          </div>
        )}

        {/* Fallback: Open in Google Maps */}
        {shelterLocation && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <p className="text-sm font-medium text-gray-900">Alternative option</p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${JSON.parse(shelterLocation).lat},${JSON.parse(shelterLocation).lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
              aria-label="Open directions in Google Maps, opens in new tab"
            >
              Open in Google Maps
            </a>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="h-12 w-full rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div role="heading" aria-level={1}>
        <h1 className="text-2xl font-semibold text-gray-900">Directions</h1>
        <p className="mt-1 text-sm text-gray-600" aria-label={`Route will take ${directions.totalDuration} and cover ${directions.totalDistance}`}>
          {directions.totalDuration} · {directions.totalDistance}
        </p>
      </div>

      {/* Travel Mode Selector */}
      <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
        <legend className="text-sm font-medium text-gray-700">Travel by</legend>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          <button
            onClick={() => handleTravelModeChange("DRIVING")}
            className={[
              "h-12 rounded-xl border font-medium text-sm transition",
              travelMode === "DRIVING"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
            ].join(" ")}
            role="radio"
            aria-checked={travelMode === "DRIVING"}
          >
            Drive
          </button>
          <button
            onClick={() => handleTravelModeChange("WALKING")}
            className={[
              "h-12 rounded-xl border font-medium text-sm transition",
              travelMode === "WALKING"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
            ].join(" ")}
            role="radio"
            aria-checked={travelMode === "WALKING"}
          >
            Walk
          </button>
          <button
            onClick={() => handleTravelModeChange("TRANSIT")}
            className={[
              "h-12 rounded-xl border font-medium text-sm transition",
              travelMode === "TRANSIT"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
            ].join(" ")}
            role="radio"
            aria-checked={travelMode === "TRANSIT"}
          >
            Transit
          </button>
        </div>
      </fieldset>

      {/* Route Summary */}
      <div 
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        role="region"
        aria-labelledby="route-heading"
      >
        <p id="route-heading" className="text-sm font-medium text-gray-700">Route</p>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-900 mt-1.5 flex-shrink-0" aria-label="Starting point"></div>
            <p className="text-sm text-gray-700">{directions.startAddress}</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400 mt-1.5 flex-shrink-0" aria-label="Destination"></div>
            <p className="text-sm text-gray-700">{directions.endAddress}</p>
          </div>
        </div>
      </div>

      {/* Turn-by-turn Steps */}
      <div 
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3"
        role="region"
        aria-labelledby="directions-heading"
      >
        <p id="directions-heading" className="text-sm font-medium text-gray-700">
          Step-by-step directions
        </p>
        
        <ol className="space-y-3" aria-label="Turn by turn directions">
          {directions.steps.map((step, index) => (
            <li
              key={index}
              className="flex gap-3 pb-3 border-b border-gray-100 last:border-0 last:pb-0"
            >
              <div className="flex-shrink-0">
                <div 
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm flex items-center justify-center"
                  aria-label={`Step ${index + 1}`}
                >
                  {index + 1}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 leading-relaxed mb-1">{step.instruction}</p>
                <p className="text-xs text-gray-500" aria-label={`${step.distance}, taking ${step.duration}`}>
                  {step.distance} · {step.duration}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Open in Maps Button */}
      <div className="space-y-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation ? JSON.parse(userLocation).lat + ',' + JSON.parse(userLocation).lng : ''}&destination=${shelterLocation ? JSON.parse(shelterLocation).lat + ',' + JSON.parse(shelterLocation).lng : ''}&travelmode=${travelMode.toLowerCase()}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          aria-label="Open directions in Google Maps, opens in new tab"
        >
          Open in Google Maps
        </a>

        <button
          onClick={() => navigate(-1)}
          className="h-12 w-full rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    </div>
  );
}