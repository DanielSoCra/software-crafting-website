export default function QuestionnaireLoading() {
  return (
    <div>
      <div className="mb-8">
        <div className="h-8 w-3/4 bg-muted rounded animate-pulse mb-2" />
        <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
      </div>
      <div className="mb-6">
        <div className="h-1.5 w-full bg-muted rounded-full animate-pulse" />
      </div>
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-4">
          <div className="h-10 bg-muted/50 rounded animate-pulse" />
          <div className="h-32 bg-muted/50 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
