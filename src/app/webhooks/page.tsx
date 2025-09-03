import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";

const events = [
  { id: "evt_1", status: "succeeded", type: "message.created", date: "2024-07-15 10:30 AM" },
  { id: "evt_2", status: "succeeded", type: "conversation.started", date: "2024-07-15 10:29 AM" },
  { id: "evt_3", status: "failed", type: "message.sent", date: "2024-07-14 08:00 PM" },
  { id: "evt_4", status: "succeeded", type: "message.created", date: "2024-07-14 07:55 PM" },
  { id: "evt_5", status: "succeeded", type: "message.created", date: "2024-07-13 11:12 AM" },
];

export default function WebhooksPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Webhook Integration</CardTitle>
          <CardDescription>
            Use webhooks to receive real-time notifications about events in your WhatsO account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-medium">Your Webhook URL</label>
            <div className="flex w-full max-w-lg items-center space-x-2">
                <Input type="text" readOnly defaultValue="https://api.whatso.com/v1/webhooks/wh_xxxxxxxxxxxx" />
                <Button size="icon" variant="outline">
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Add this URL to your external system to receive events.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Recent Events</CardTitle>
          <CardDescription>A log of the most recent events sent to your endpoint.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-mono text-xs">{event.id}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === 'succeeded' ? 'secondary' : 'destructive'} className={event.status === 'succeeded' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : ''}>
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{event.type}</TableCell>
                  <TableCell>{event.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
