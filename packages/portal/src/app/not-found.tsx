import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold mb-2">Seite nicht gefunden</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Die angeforderte Seite existiert nicht oder ist noch nicht verfügbar.
          </p>
          <Button asChild>
            <a href="/portal/dashboard">Zum Dashboard</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
