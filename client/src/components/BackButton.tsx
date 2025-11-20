import { useNavigate } from "react-router-dom";

export default function BackButton({ className = "" }: { className?: string }) {
  const navigate = useNavigate();

  const handleBack = () => {
    // Go back if possible; fallback to home
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  return (
    <button
      onClick={handleBack}
      aria-label="Quay lại"
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow transition ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="w-5 h-5"
      >
        <path d="M10.828 12 16.364 6.464a1 1 0 1 0-1.414-1.414l-6.657 6.657a1 1 0 0 0 0 1.414l6.657 6.657a1 1 0 0 0 1.414-1.414L10.828 12Z" />
      </svg>
      <span>Quay lại</span>
    </button>
  );
}
