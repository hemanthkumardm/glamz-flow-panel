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
    const [audience, setAudience] = useState<{ phone: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [statsData, audienceData] = await Promise.all([
                api.getBroadcastStats(),
                api.getAudience()
            ]);
            setStats(statsData);
            setAudience(audienceData);
        } catch {
            toast.error("Failed to load audience stats");
        } finally {
            setLoading(false);
        }
    };

    const sendManual = (phone: string, name: string) => {
        if (!message.trim()) {
            toast.error("Please enter a message content first");
            return;
        }
        const cleanPhone = phone.replace(/\D/g, "");
        // Personalize message slightly if name is available and not just Guest
        let textToSend = message;
        if (name && name !== "Guest" && name !== "Walk-in") {
            textToSend = `Hello ${name},\n\n${message}`;
        }
        const url = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(textToSend)}`;
        window.open(url, "_blank");
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

                    {audience.length > 0 && message.trim().length > 0 && (
                        <div className="pt-4 border-t">
                            <h3 className="text-sm font-semibold mb-3">Send to your contacts:</h3>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {audience.map((person, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                        <div>
                                            <div className="font-medium text-sm">{person.name}</div>
                                            <div className="text-xs text-muted-foreground">{person.phone}</div>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            onClick={() => sendManual(person.phone, person.name)}
                                        >
                                            <Send className="h-3 w-3 mr-1.5" />
                                            Send
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
