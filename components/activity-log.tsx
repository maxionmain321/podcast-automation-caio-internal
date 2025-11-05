import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { ActivityLogEntry } from "./dashboard-content"

export function ActivityLog({ entries }: { entries: ActivityLogEntry[] }) {
  const getTypeBadge = (type: ActivityLogEntry["type"]) => {
    const variants = {
      upload: "default",
      transcribe: "secondary",
      generate: "secondary",
      publish: "default",
      error: "destructive",
    } as const

    return <Badge variant={variants[type]}>{type}</Badge>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>Recent workflow events</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm">
                  <div className="flex-shrink-0 mt-0.5">{getTypeBadge(entry.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{entry.message}</p>
                    <p className="text-xs text-muted-foreground">{entry.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
