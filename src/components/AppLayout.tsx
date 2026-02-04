import { NavLink } from "react-router-dom";

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        [
          "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors text-center",
          isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100",
        ].join(" ")
      }
    >
      {label}
    </NavLink>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-base font-semibold text-gray-900">
            Emergency Housing Finder
          </div>
          <div className="mt-1 text-xs text-gray-600">
            Availability can change — always call ahead.
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-md px-4 py-4 pb-24">{children}</main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="flex gap-2">
            <NavItem to="/" label="Home" />
            <NavItem to="/saved" label="Saved" />
            <NavItem to="/suggest" label="Update" />
          </div>
        </div>
      </nav>
    </div>
  );
}
