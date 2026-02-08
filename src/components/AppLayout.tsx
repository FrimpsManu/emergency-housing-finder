import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-center",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2",
          isActive
            ? "bg-gray-900 text-white shadow-sm"
            : "text-gray-700 hover:bg-gray-100",
        ].join(" ")
      }
      aria-current={({ isActive }) => (isActive ? "page" : undefined)}
    >
      {label}
    </NavLink>
  );
}

function RegisterModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [formData, setFormData] = useState({
    user_id: "",
    email: "",
    phone: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          alert_enabled: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      setStatus("success");
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setFormData({ user_id: "", email: "", phone: "" });
      }, 2000);
    } catch (error) {
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Registration failed");
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            Register for Disaster Alerts
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close registration dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="mb-6 text-sm text-gray-600">
          Get instant SMS and email alerts when natural disasters are detected near your location.
        </p>

        {status === "success" ? (
          <div 
            className="rounded-lg bg-green-50 p-4 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="mb-2 text-2xl" aria-hidden="true">✓</div>
            <p className="font-medium text-green-900">Successfully registered!</p>
            <p className="mt-1 text-sm text-green-700">
              You'll receive alerts for disasters in your area.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="user_id" className="block text-sm font-medium text-gray-700">
                User ID <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                type="text"
                id="user_id"
                required
                aria-required="true"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="Enter a unique identifier"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="+1234567890"
              />
            </div>

            <p className="text-xs text-gray-500" role="note">
              * At least one contact method (email or phone) is required
            </p>

            {status === "error" && (
              <div 
                className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
                role="alert"
                aria-live="assertive"
              >
                {errorMessage}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "loading"}
                aria-busy={status === "loading"}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {status === "loading" ? "Registering..." : "Register"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur" role="banner">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-base font-semibold text-gray-900">
                Emergency Housing Finder
              </h1>
              <p className="mt-1 text-xs text-gray-600">
                Availability can change — always call ahead.
              </p>
            </div>
            <button
              onClick={() => navigate("/signup")}
              className="ml-2 flex-shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 transition-colors"
              aria-label="Sign up to get disaster alerts"
            >
              Get Alerts
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-md px-4 py-5 pb-28" role="main">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/90 backdrop-blur"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Safe area support for iOS */}
        <div className="mx-auto w-full max-w-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <NavItem to="/" label="Home" />
            <NavItem to="/saved" label="Saved" />
            <NavItem to="/suggest" label="Update" />
          </div>
        </div>
      </nav>

      {/* Registration Modal */}
      <RegisterModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}