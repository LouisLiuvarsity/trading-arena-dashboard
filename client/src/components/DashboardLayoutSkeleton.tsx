import { Skeleton } from './ui/skeleton';

export function DashboardLayoutSkeleton() {
  return (
    <div className="admin-shell min-h-screen">
      <div className="border-b border-white/[0.06] bg-[#0B0F17]/82 px-4 py-4 backdrop-blur-xl lg:px-8">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40 rounded-full" />
                <Skeleton className="h-3 w-56 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-12 w-56 rounded-2xl" />
          </div>
          <div className="flex gap-2 overflow-hidden">
            <Skeleton className="h-11 w-24 rounded-2xl" />
            <Skeleton className="h-11 w-24 rounded-2xl" />
            <Skeleton className="h-11 w-24 rounded-2xl" />
            <Skeleton className="h-11 w-24 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8 lg:py-8">
        <Skeleton className="h-52 rounded-[32px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-32 rounded-[24px]" />
        </div>
        <Skeleton className="h-72 rounded-[28px]" />
      </div>
    </div>
  );
}
