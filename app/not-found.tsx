import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="font-display text-8xl font-light text-cream-300 mb-4">404</div>
        <h1 className="font-display text-2xl font-light text-ink-900 mb-2">Page not found</h1>
        <p className="text-sm text-ink-400 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  );
}
