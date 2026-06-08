export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">CRM Platform</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Multi-tenant B2B CRM for growing sales teams
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <a
            href="/auth/register"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Start free trial
          </a>
          <a
            href="/auth/login"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold hover:bg-secondary"
          >
            Sign in
          </a>
        </div>
      </div>
    </main>
  );
}
