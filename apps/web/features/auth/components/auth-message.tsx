interface AuthMessageProps {
  message?: string;
  tone?: "error" | "info";
}

export function AuthMessage({ message, tone = "info" }: AuthMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm font-medium ${
        tone === "error" ? "bg-rose-100 text-rose-900" : "bg-teal-100 text-teal-950"
      }`}
    >
      {message}
    </div>
  );
}

