type ResourceCardProps = {
  name: string;
  city: string;
  state: string;
  tags: string[];
  phone: string;
  directionsUrl?: string;
  onOpen?: () => void;
  reason?: string;
};

export default function ResourceCard({
  name,
  city,
  state,
  tags,
  phone,
  directionsUrl,
  onOpen,
  reason,
}: ResourceCardProps) {
  return (
    <div
      className="rounded-2xl bg-white p-4 shadow-sm space-y-3 border border-transparent hover:border-gray-200 transition"
      onClick={onOpen}
      {...(onOpen ? { role: "button" } : {})}
      tabIndex={onOpen ? 0 : undefined}
    >
      <div className="space-y-1">
        <p className="text-base font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-600">
          {city}, {state}
        </p>

        {reason && (
    <p className="mt-1 text-xs text-gray-600">
      <span className="font-medium text-gray-700">Shown because:</span> {reason}
    </p>
  )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
            {t}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`tel:${phone}`}
          className="h-11 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          Call Now
        </a>

        {directionsUrl ? (
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="h-11 rounded-xl border border-gray-200 bg-white text-gray-900 font-semibold flex items-center justify-center hover:bg-gray-50"
            onClick={(e) => e.stopPropagation()}
          >
            Directions
          </a>
        ) : (
          <div className="h-11 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-semibold flex items-center justify-center">
            Call for location
          </div>
        )}
      </div>
    </div>
  );
}
