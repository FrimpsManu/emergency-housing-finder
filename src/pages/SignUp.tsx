import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

type Location = {
  lat: string;
  lng: string;
};

type VerificationStep = "register" | "verify-phone" | "verify-email" | "complete";

export default function SignUp() {
  const navigate = useNavigate();

  const [step, setStep] = useState<VerificationStep>("register");
  const [userId, setUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    phone: "",
    email: "",
  });

  const [verificationCodes, setVerificationCodes] = useState({
    phone: "",
    email: "",
  });

  const [detectedLocation, setDetectedLocation] = useState<Location | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "success" | "error">("loading");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Manual location state
  const [manualLocation, setManualLocation] = useState({
    latitude: "",
    longitude: "",
  });
  const [useManualLocation, setUseManualLocation] = useState(false);

  // Auto-detect location on component mount
  useEffect(() => {
    detectLocation();
    
    // Load Google Places API - check both window.google AND existing script tag
    const loadGoogleMapsScript = () => {
      // Check if already loaded or loading
      if (window.google) return;
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) return;
      
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_MAPS_API}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };
    
    loadGoogleMapsScript();
  }, []);

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

  function detectLocation(isRetry: boolean = false) {
    // Only set to loading if it's not a retry (prevents flicker)
    if (!isRetry) {
      setLocationStatus("loading");
    }
    
    getUserLocation()
      .then((position) => {
        const location: Location = {
          lat: position.coords.latitude.toString(),
          lng: position.coords.longitude.toString(),
        };
        setDetectedLocation(location);
        setLocationStatus("success");
        setUseManualLocation(false); // Switch back to auto-detected location
      })
      .catch((error) => {
        console.error("Error getting user location:", error);
        setLocationStatus("error");
      });
  }

  // Format phone number with +1 prefix
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 10 digits (US phone number)
    const truncated = digits.slice(0, 10);
    
    // Format as (XXX) XXX-XXXX
    if (truncated.length >= 6) {
      return `(${truncated.slice(0, 3)}) ${truncated.slice(3, 6)}-${truncated.slice(6)}`;
    } else if (truncated.length >= 3) {
      return `(${truncated.slice(0, 3)}) ${truncated.slice(3)}`;
    } else if (truncated.length > 0) {
      return `(${truncated}`;
    }
    
    return '';
  };

  // Convert formatted phone to E.164 format
  const toE164Format = (formattedPhone: string) => {
    const digits = formattedPhone.replace(/\D/g, '');
    return digits.length === 10 ? `+1${digits}` : '';
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    if (!formData.phone) {
      setStatus("error");
      setErrorMessage("Phone number is required");
      return;
    }

    // Convert to E.164 format for backend
    const e164Phone = toE164Format(formData.phone);
    
    if (!e164Phone) {
      setStatus("error");
      setErrorMessage("Please enter a valid 10-digit phone number");
      return;
    }

    // Determine which location to use
    let latitude = null;
    let longitude = null;

    if (useManualLocation && manualLocation.latitude && manualLocation.longitude) {
      latitude = manualLocation.latitude;
      longitude = manualLocation.longitude;
    } else if (detectedLocation) {
      latitude = detectedLocation.lat;
      longitude = detectedLocation.lng;
    }

    // Validate location is provided
    if (!latitude || !longitude) {
      setStatus("error");
      setErrorMessage("Location is required. Please allow location access or enter coordinates manually.");
      return;
    }

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: e164Phone,
          email: formData.email || null,
          alert_enabled: true,
          latitude: latitude,
          longitude: longitude,
        }),
      });

      const data = await response.json();

      // Handle duplicate phone number (409 Conflict)
      if (response.status === 409) {
        setStatus("error");
        setErrorMessage(
          data.message || "This phone number is already registered for disaster alerts."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      const newUserId = data.data.id;
      setUserId(newUserId);

      // Send phone verification code
      await sendPhoneVerificationCode(newUserId);

      // Move to phone verification step
      setStep("verify-phone");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Registration failed");
    }
  };

  const sendPhoneVerificationCode = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}/verify/phone/send`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending phone verification:", error);
    }
  };

  const sendEmailVerificationCode = async (id: number) => {
    try {
      const response = await fetch(`/api/users/${id}/verify/email/send`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending email verification:", error);
    }
  };

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/users/${userId}/verify/phone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: verificationCodes.phone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // If email exists, verify email next, otherwise complete
      if (formData.email) {
        await sendEmailVerificationCode(userId!);
        setStep("verify-email");
      } else {
        setStep("complete");
      }
      
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Verification failed");
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`/api/users/${userId}/verify/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: verificationCodes.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      setStep("complete");
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Verification failed");
    }
  };

  // Check if location is provided (either auto-detected or manual)
  const hasLocation = 
    (detectedLocation !== null) || 
    (useManualLocation && manualLocation.latitude && manualLocation.longitude);
  
  const isFormValid = 
    formData.phone.replace(/\D/g, '').length === 10 && 
    hasLocation;

  // Complete screen
  if (step === "complete") {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gray-50 p-6 text-center">
          <div className="mb-3 text-4xl">✓</div>
          <h2 className="text-xl font-semibold text-gray-900">
            You're all verified!
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            You'll now receive SMS{formData.email ? ' and email' : ''} alerts when natural disasters are detected near your location.
          </p>
          <div className="mt-4 rounded-lg bg-white p-4">
            <p className="text-sm text-gray-800 font-medium">To unsubscribe anytime:</p>
            <p className="mt-2 text-base text-gray-900">
              Reply <span className="font-bold">STOP</span> to any alert message
            </p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="mt-6 w-full h-12 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Phone verification screen
  if (step === "verify-phone") {
    return (
      <form onSubmit={handleVerifyPhone} className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Verify your phone number
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            We sent a 6-digit code to {formData.phone}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <label htmlFor="phone-code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            type="text"
            id="phone-code"
            required
            maxLength={6}
            value={verificationCodes.phone}
            onChange={(e) => setVerificationCodes({ ...verificationCodes, phone: e.target.value.replace(/\D/g, '') })}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="000000"
          />
          <p className="text-xs text-gray-500">
            Code expires in 10 minutes
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={verificationCodes.phone.length !== 6 || status === "loading"}
          className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Verifying..." : "Verify Phone"}
        </button>

        <button
          type="button"
          onClick={() => sendPhoneVerificationCode(userId!)}
          className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Resend code
        </button>
      </form>
    );
  }

  // Email verification screen
  if (step === "verify-email") {
    return (
      <form onSubmit={handleVerifyEmail} className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Verify your email
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            We sent a 6-digit code to {formData.email}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <label htmlFor="email-code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            type="text"
            id="email-code"
            required
            maxLength={6}
            value={verificationCodes.email}
            onChange={(e) => setVerificationCodes({ ...verificationCodes, email: e.target.value.replace(/\D/g, '') })}
            className="w-full rounded-xl border border-gray-300 px-3 py-3 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="000000"
          />
          <p className="text-xs text-gray-500">
            Code expires in 10 minutes
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={verificationCodes.email.length !== 6 || status === "loading"}
          className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Verifying..." : "Verify Email"}
        </button>

        <button
          type="button"
          onClick={() => sendEmailVerificationCode(userId!)}
          className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Resend code
        </button>

        <button
          type="button"
          onClick={() => setStep("complete")}
          className="w-full text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Skip email verification
        </button>
      </form>
    );
  }

  // Registration form
  return (
    <form onSubmit={handleRegister} className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Get disaster alerts in your area
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Receive instant SMS notifications about natural disasters near you.
        </p>
      </div>

      {/* Alert Info Box */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-lg bg-gray-100 p-2">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">
              Stay informed and safe
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Get real-time SMS alerts for medium to high-risk disasters including floods, wildfires, earthquakes, and severe weather.
            </p>
          </div>
        </div>
      </div>

      {/* Phone Number - REQUIRED */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <span className="text-gray-500 text-base">+1</span>
          </div>
          <input
            type="tel"
            id="phone"
            required
            value={formData.phone}
            onChange={handlePhoneChange}
            className="w-full rounded-xl border border-gray-300 pl-10 pr-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="(555) 123-4567"
          />
        </div>
        <p className="text-xs text-gray-500">
          US phone numbers only. Your number will be formatted as +1 (XXX) XXX-XXXX
        </p>
      </div>

      {/* Email - OPTIONAL */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="your@email.com"
        />
        <p className="text-xs text-gray-500">
          Add your email to receive backup alerts and detailed information.
        </p>
      </div>

      {/* Location Detection - REQUIRED */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <label className="text-sm font-medium text-gray-700">
          Your Location <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500">
          We need your location to send you relevant disaster alerts
        </p>

        {/* Initial loading (first time only) */}
        {locationStatus === "loading" && !detectedLocation && !useManualLocation && (
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900"></div>
            <span className="text-sm text-gray-600">Detecting your location...</span>
          </div>
        )}

        {/* Location detected successfully */}
        {locationStatus === "success" && detectedLocation && !useManualLocation && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-3 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">✓ Location detected</p>
                <p className="mt-1 text-xs text-green-700">
                  Lat: {parseFloat(detectedLocation.lat).toFixed(4)}, Lng: {parseFloat(detectedLocation.lng).toFixed(4)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => detectLocation(true)}
                className="text-xs text-green-700 underline hover:text-green-900"
              >
                Refresh
              </button>
            </div>
            <button
              type="button"
              onClick={() => setUseManualLocation(true)}
              className="mt-2 text-xs text-green-700 underline hover:text-green-900"
            >
              Enter location manually instead
            </button>
          </div>
        )}

        {/* Location detection failed - prompt manual entry */}
        {locationStatus === "error" && !useManualLocation && (
          <div className="space-y-3">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
              <p className="text-sm font-medium text-amber-900">
                Unable to detect your location
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Please allow location access or enter your coordinates manually below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUseManualLocation(true)}
              className="w-full rounded-xl bg-gray-900 px-3 py-3 text-sm font-medium text-white hover:bg-gray-800 transition"
            >
              Enter Location Manually
            </button>
            <button
              type="button"
              onClick={() => detectLocation(true)}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-sm font-medium text-gray-900 hover:bg-gray-50 transition"
            >
              Try Auto-Detect Again
            </button>
          </div>
        )}

        {/* Manual location entry */}
        {useManualLocation && (
          <div className="space-y-3">
            <div>
              <label htmlFor="location-search" className="block text-xs font-medium text-gray-700 mb-1">
                Search for your location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location-search"
                placeholder="Enter city, address, or ZIP code"
                onFocus={(e) => {
                  // Initialize Google Places Autocomplete
                  if (window.google && !e.target.dataset.initialized) {
                    const autocomplete = new window.google.maps.places.Autocomplete(e.target, {
                      types: ['geocode'],
                      fields: ['geometry', 'formatted_address']
                    });
                    
                    autocomplete.addListener('place_changed', () => {
                      const place = autocomplete.getPlace();
                      if (place.geometry && place.geometry.location) {
                        setManualLocation({
                          latitude: place.geometry.location.lat().toString(),
                          longitude: place.geometry.location.lng().toString()
                        });
                      }
                    });
                    
                    e.target.dataset.initialized = 'true';
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            
            {manualLocation.latitude && manualLocation.longitude && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <p className="text-xs text-green-800">
                  ✓ Location set: {parseFloat(manualLocation.latitude).toFixed(4)}, {parseFloat(manualLocation.longitude).toFixed(4)}
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500">
              💡 Start typing to search for any address, city, or landmark
            </p>
            
            <button
              type="button"
              onClick={() => detectLocation(true)}
              className="w-full text-xs text-gray-600 hover:text-gray-900 underline"
            >
              Try auto-detect instead
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {status === "error" && errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
              {errorMessage.includes("already registered") && (
                <p className="mt-2 text-xs text-red-700">
                  Already receiving alerts? Reply STOP to any alert message to unsubscribe, or contact support if you need help.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid || status === "loading"}
        className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {status === "loading" ? "Registering..." : "Register for SMS Alerts"}
      </button>

      {/* Privacy Note */}
      <div className="rounded-xl bg-gray-50 p-3">
        <p className="text-xs text-gray-600">
          By registering, you agree to receive emergency SMS alerts. Standard messaging rates may apply. 
          You can unsubscribe anytime. We respect your privacy and will only use your phone number for disaster notifications.
        </p>
      </div>
    </form>
  );
}