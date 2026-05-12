export default function CallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-page px-4 text-center">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold">Signing you in...</h1>
        <p className="text-sm text-brand-muted">
          The backend should redirect you to <code>/queue</code>. If you&apos;re still on this page in 10s,
          retry the magic link.
        </p>
      </div>
    </main>
  );
}
