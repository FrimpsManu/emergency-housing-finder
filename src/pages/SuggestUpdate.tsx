import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";


type UpdateType = "Incorrect information" | "Closed location" | "New housing resource";

type UpdateSubmission = {
  id: string;
  resourceId?: string;
  type: UpdateType;
  resourceName?: string;
  details: string;
  contact?: string;
  createdAt: string;
};

function loadSubmissions(): UpdateSubmission[] {
  try {
    const raw = localStorage.getItem("ehf_update_submissions");
    if (!raw) return [];
    return JSON.parse(raw) as UpdateSubmission[];
  } catch {
    return [];
  }
}

function saveSubmissions(items: UpdateSubmission[]) {
  localStorage.setItem("ehf_update_submissions", JSON.stringify(items));
}

export default function SuggestUpdate() {
  const nav = useNavigate();
  const { id } = useParams();

  const [type, setType] = useState<UpdateType>("Incorrect information");
  const [resourceName, setResourceName] = useState("");
  const [details, setDetails] = useState("");
  const [contact, setContact] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = useMemo(() => details.trim().length >= 10, [details]);

  function handleSubmit() {
    const submission: UpdateSubmission = {
      id: 
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      type,
      resourceId: id,
      resourceName: resourceName.trim() || undefined,
      details: details.trim(),
      contact: contact.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    const existing = loadSubmissions();
    const next = [submission, ...existing].slice(0, 50);
    saveSubmissions(next);

    setSubmitted(true);
    setResourceName("");
    setDetails("");
    setContact("");
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => nav(-1)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Back
        </button>

        {/* Back to resource (quick path) */}
        <button
          onClick={() => (id ? nav(`/resource/${id}`) : nav("/"))}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to resource
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Suggest an Update</h1>
        <p className="mt-1 text-sm text-gray-600">
          Help keep housing info accurate. We’ll review updates before applying them.
        </p>
      </div>

      {submitted && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Thanks — update submitted.</p>
            <p className="mt-1 text-sm text-gray-600">
              If this is urgent, please call 211 for immediate help.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <a
              href="tel:211"
              className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
            >
              Call 211
            </a>

            {/* Back to resource button after submit */}
            <button
              onClick={() => (id ? nav(`/resource/${id}`) : nav("/"))}
              className="h-12 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50"
            >
              Back to resource
            </button>
          </div>
        </div>
      )}

      {/* Hide form after submit */}
      {!submitted && (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-4">
          <div className="space-y-2">
            <label htmlFor="update-type" className="text-sm font-medium text-gray-700">
              Update type
            </label>
            <select
              id="update-type"
              value={type}
              onChange={(e) => setType(e.target.value as UpdateType)}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option>Incorrect information</option>
              <option>Closed location</option>
              <option>New housing resource</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Resource name (optional)
            </label>
            <input
              value={resourceName}
              onChange={(e) => setResourceName(e.target.value)}
              placeholder="Example: Hope Shelter Downtown"
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Details</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Describe what’s wrong or what should be updated (minimum 10 characters)."
              rows={5}
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
            <p className="text-xs text-gray-500">
              Please don’t include sensitive personal information.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Contact (optional)</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone (optional)"
              className="w-full rounded-xl border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Update
          </button>
        </div>
      )}
    </div>
  );
}