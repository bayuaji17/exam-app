import { AppearanceDropdown } from "@/components/appearance-dropdown"

export default function Page() {
  return (
    <main className="flex min-h-svh p-6">
      <div className="flex max-w-xl min-w-0 flex-col gap-6 text-sm leading-loose">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="text-2xl font-semibold leading-tight">
              Appearance
            </h1>
          </div>
          <AppearanceDropdown />
        </header>

        <section className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-card-foreground">
          <div className="rounded-md border bg-background p-4 text-base leading-8 transition-colors">
            The quick brown fox jumps over the lazy dog. Bright vixens jump; dozy
            fowl quack. Pack my box with five dozen liquor jugs.
          </div>

          <p className="text-muted-foreground">
            Sphinx of black quartz, judge my vow. Waltz, bad nymph, for quick
            jigs vex.
          </p>
        </section>
      </div>
    </main>
  )
}
