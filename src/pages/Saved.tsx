export default function Saved() {
  // Dataset + save logic will be wired later.
  const savedCount = 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Saved</h1>
        <p className="mt-1 text-sm text-gray-600">
          Save resources so you can call back quickly.
        </p>
      </div>

      {savedCount === 0 ? (
        <div className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-gray-900">No saved resources yet</p>
          <p className="text-sm text-gray-600">
            When you find a shelter you might want to call later, tap “Save” on the detail page.
          </p>

          <a
            href="/"
            className="h-12 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          >
            Browse options
          </a>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-700">Saved list will appear here.</p>
        </div>
      )}
    </div>
  );
}
