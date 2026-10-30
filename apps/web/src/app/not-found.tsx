import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181b] border border-[#27272a] text-xs font-mono text-red-400 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        HTTP 404 - Not Found
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
        Page Not Located
      </h1>
      <p className="text-sm sm:text-base text-[#a1a1aa] max-w-md mb-8">
        The requested resource, incident, or project could not be found on Pulse. Verify the URL or return to the project dashboard.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors shadow-lg shadow-red-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
