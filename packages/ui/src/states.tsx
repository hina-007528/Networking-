export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="h-4 rounded bg-ink-100" />
      ))}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {body ? <p className="mt-2 text-sm text-ink-600">{body}</p> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center" role="alert">
      <p className="font-display text-lg font-semibold text-ink-950">{title}</p>
      {body ? <p className="mt-2 text-sm text-ink-700">{body}</p> : null}
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-ink-950 px-4 text-sm font-semibold text-white"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {item.href && index < items.length - 1 ? (
              <a href={item.href} className="hover:text-storm-700">
                {item.label}
              </a>
            ) : (
              <span className="text-ink-800" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
