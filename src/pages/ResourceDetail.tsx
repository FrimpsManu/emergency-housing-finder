import { useParams } from "react-router-dom";

export default function ResourceDetail() {
  const { id } = useParams();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Resource Details</h1>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-gray-800">
          Viewing resource ID: {id}
        </p>
      </div>
    </div>
  );
}
