export default function DashboardLoading() {
  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-32 bg-muted/50 rounded animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-16 bg-muted/50 rounded animate-pulse" />
      </div>
    </div>
  );
}
