import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const [location, setLocation] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [noId, setNoId] = useState(false);
  const [family, setFamily] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  function handleSearch() {
    navigate(
      `/results?location=${encodeURIComponent(location)}&urgent=${urgent}&noId=${noId}&family=${family}&freeOnly=${freeOnly}`
    );
  }

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

      {/* Location */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Location
        </label>
        <input
          type="text"
          placeholder="Enter city or ZIP"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="text-xs text-gray-500">
          Use your current city or ZIP code.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
        <p className="text-sm font-medium text-gray-700">
          Your situation
        </p>

        <FilterRow
          label="I need housing urgently"
          checked={urgent}
          onChange={setUrgent}
        />
        <FilterRow
          label="I don’t have ID"
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
        disabled={!location.trim()}
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
    <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-3">
      <span className="text-sm text-gray-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-gray-900"
      />
    </label>
  );
}
