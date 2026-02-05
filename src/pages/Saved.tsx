import { useEffect, useState } from "react";
import { getSaved, removeResource } from "../utils/savedResources";
import type { SavedResource } from "../utils/savedResources";
import { useNavigate } from "react-router-dom";

export default function Saved() {
  const nav = useNavigate();
  const [saved, setSaved] = useState<SavedResource[]>([]);

  useEffect(() => {
    setSaved(getSaved());
  }, []);


  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Saved</h1>
        <p className="mt-1 text-sm text-gray-600">
          Quickly return to resources you want to call.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-900">No saved resources yet</p>
          <p className="text-sm text-gray-600">
            Tap “Save” on a resource to keep it here.
          </p>
          <button
            onClick={() => nav("/")}
            className="w-full h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Browse options
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {saved.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl bg-white p-4 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-sm text-gray-600">
                  {r.city}, {r.state}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => nav(`/resource/${r.id}`)}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  View
                </button>
                <button
                  onClick={() => {
                    removeResource(r.id);
                    setSaved(getSaved());
                  }}
                  className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
