export function ClubPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-8 w-64 max-w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-32 max-w-full bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="h-16 w-40 max-w-full bg-white border border-gray-200 rounded-lg animate-pulse" />
        </div>

        <div className="flex gap-6 border-b border-gray-200 pb-3 mb-6">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </div>

        <MeetingsListSkeleton count={2} />
      </main>
    </div>
  );
}

export function MeetingsListSkeleton({ count = 2 }) {
  return (
    <div className="space-y-3 sm:space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 animate-pulse flex items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
            <div className="w-14 h-20 sm:w-16 sm:h-24 bg-gray-200 rounded-md shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-5 w-48 sm:w-64 max-w-full bg-gray-200 rounded" />
              <div className="h-3.5 w-32 max-w-full bg-gray-200 rounded" />
              <div className="h-3.5 w-44 max-w-full bg-gray-200 rounded" />
            </div>
          </div>
          <div className="h-6 w-16 bg-gray-200 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ClubsGridSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 animate-pulse flex flex-col"
        >
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="h-6 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-5 w-40 max-w-full bg-gray-200 rounded mb-2" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MuralListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-gray-200 animate-pulse space-y-3"
        >
          <div className="space-y-2">
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-4/5 bg-gray-200 rounded" />
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="h-3 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewsListSkeleton({ count = 2 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-3.5 rounded-lg border border-gray-100 shadow-sm animate-pulse space-y-2"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-3 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-full bg-gray-200 rounded" />
          <div className="h-3 w-3/4 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
