export default function Loading() {
  return (
    <main id="main-content" className="space-page page-shell mx-auto w-full max-w-[1660px] px-4 pt-4 sm:px-5 lg:px-6">
      <div className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(680px,760px)_312px]">
        <div className="space-rail hidden h-[calc(100vh-48px)] lg:block" />
        <section className="grid gap-5">
          <div className="space-hero rounded-[32px] px-6 py-6">
            <div className="surface-skeleton h-6 w-36 rounded-full" />
            <div className="mt-4 surface-skeleton h-14 max-w-[420px] rounded-[24px]" />
            <div className="mt-4 surface-skeleton h-20 max-w-[560px] rounded-[24px]" />
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <section key={index} className="space-window rounded-[28px] p-5">
              <div className="surface-skeleton h-4 w-40 rounded-full" />
              <div className="mt-4 surface-skeleton h-28 rounded-[24px]" />
              <div className="mt-4 surface-skeleton h-20 rounded-[24px]" />
            </section>
          ))}
        </section>
        <aside className="hidden xl:block">
          <div className="grid gap-5">
            <div className="space-window surface-skeleton h-48 rounded-[28px]" />
            <div className="space-window surface-skeleton h-64 rounded-[28px]" />
          </div>
        </aside>
      </div>
    </main>
  );
}

