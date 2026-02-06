import React from "react";
import { NavLink } from "react-router-dom";

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
    >
      {label}
    </NavLink>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="mx-auto w-full max-w-md px-4 py-3">
          <div className="text-base font-semibold text-gray-900">
            Emergency Housing Finder
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Availability can change — always call ahead.
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-md px-4 py-5 pb-28">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-gray-200 bg-white/90 backdrop-blur">
        {/* Safe area support for iOS */}
        <div className="mx-auto w-full max-w-md px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
            <NavItem to="/" label="Home" />
            <NavItem to="/saved" label="Saved" />
            <NavItem to="/suggest" label="Update" />
          </div>
        </div>
      </nav>
    </div>
  );
}
