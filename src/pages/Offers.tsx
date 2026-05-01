import { useEffect, useState } from "react";
import * as api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Megaphone, Users, Send, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Offers() {
    const [message, setMessage] = useState("");
    const [stats, setStats] = useState<api.BroadcastStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await api.getBroadcastStats();
            setStats(data);
        } catch {
            toast.error("Failed to load audience stats");
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcast = async () => {
        if (!message.trim()) {
            toast.error("Please enter a message content");
            return;
        }

        const total = (stats?.totalRegistered || 0) + (stats?.totalWalkins || 0);
        if (total === 0) {
            toast.error("No recipients found");
            return;
        }

        if (!confirm(`Are you sure you want to send this broadcast to ${total} recipients?`)) {
            return;
        }

        setSending(true);
        try {
            const res = await api.broadcastMessage(message);
            toast.success(`Broadcast started! Sending to ${res.recipientCount} people.`);
            setMessage("");
        } catch (err: any) {
            toast.error(err.message || "Failed to start broadcast");
        } finally {
            setSending(false);
        }
    };

    const totalAudience = stats ? stats.totalRegistered + stats.totalWalkins : 0;

    return (
        <div className="p-6 max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Offers & Broadcasting</h1>
                <p className="text-sm text-muted-foreground">Send bulk WhatsApp updates and promotional offers to your customers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" /> Reach
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : totalAudience}</div>
                        <p className="text-xs text-muted-foreground">Total unique contacts</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Registered</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats?.totalRegistered || 0}</div>
                        <p className="text-xs text-muted-foreground">App customers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Walk-ins</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "..." : stats?.totalWalkins || 0}</div>
                        <p className="text-xs text-muted-foreground">One-time guests</p>
                    </CardContent>
                </Card>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Audience Note</AlertTitle>
                <AlertDescription>
                    This broadcast will reach every unique phone number captured in your system. Registered customers take priority over walk-ins to avoid duplicates.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Megaphone className="h-5 w-5" /> Compose Message
                    </CardTitle>
                    <CardDescription>
                        Type your message below. WhatsApp formatting (*bold*, _italic_) is supported.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="E.g. Special Offer! Get 20% off on all haircuts this weekend. Reply to book your slot now! ✂️"
                        className="min-h-[200px] text-base"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                    />

                    <div className="flex justify-end pt-2">
                        <Button
                            size="lg"
                            className="px-8 shadow-lg"
                            onClick={handleBroadcast}
                            disabled={sending || totalAudience === 0}
                        >
                            {sending ? (
                                "Sending..."
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Send Broadcast
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
