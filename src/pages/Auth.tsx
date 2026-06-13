import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import { toast } from "sonner";

export default function Auth() {
  const nav = useNavigate();
  const { user, loading, login, signUp, signOut } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(true);
  const [isAdminPortal, setIsAdminPortal] = useState(true);

  useEffect(() => {
    api.getAuthStatus()
      .then(data => setInitialized(data.initialized))
      .catch(err => {
        console.error("Auth status error:", err);
        toast.error("Failed to connect to database: " + err.message);
        setInitialized(false);
      });
  }, []);

  useEffect(() => {
    if (!loading && user) nav("/", { replace: true });
  }, [user, loading, nav]);

  const switchPortal = () => {
    setIsAdminPortal(!isAdminPortal);
    setIsLogin(true);
    setPhone("");
    setPassword("");
    setFullName("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (isLogin) {
        const u = await login(phone, password);

        // Enforce strict portal-role matching
        if (isAdminPortal && u.role !== "admin") {
          signOut();
          throw new Error("Access denied: This portal is for Administrators only.");
        }
        if (!isAdminPortal && u.role !== "staff") {
          signOut();
          throw new Error("Access denied: Administrators must use the Admin Portal.");
        }
        // Redirect based on role
        const landing = u.role === "admin" ? "/" : "/billing";
        nav(landing, { replace: true });
      } else {
        await signUp(phone, password, fullName, "admin");
        toast.success("Admin account created, please login");
        setIsLogin(true);
        setInitialized(true);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 p-4">
      <Card className="w-full max-w-md shadow-lg border-0 overflow-hidden">
        <div className={`h-1.5 w-full ${isAdminPortal ? 'bg-primary' : 'bg-orange-600'}`} />
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <img src="/smg.png" alt="Logo" className="h-16 w-16 mb-4 object-contain" />
          <CardTitle className="text-2xl font-bold tracking-tight">S M Glamz</CardTitle>
          <CardDescription className="font-semibold text-foreground">
            {isAdminPortal ? "Admin Portal" : "Staff Portal"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" value={isLogin ? "signin" : "signup"} onValueChange={(v) => setIsLogin(v === "signin")}>
            <TabsList className={`grid ${(!initialized && isAdminPortal) ? 'grid-cols-2' : 'grid-cols-1'} w-full`}>
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              {!initialized && isAdminPortal && <TabsTrigger value="signup">Sign up</TabsTrigger>}
            </TabsList>
            <div className="mt-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Admin Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder={isAdminPortal ? "Admin Phone" : "Staff Phone"} value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pass">Password</Label>
                  <Input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className={`w-full ${!isAdminPortal && 'bg-orange-600 hover:bg-orange-700'}`} disabled={busy}>
                  {busy ? "Please wait..." : (isLogin ? "Sign in" : "Create Admin account")}
                </Button>

                <div className="pt-2 border-t mt-4 text-center">
                  <Button variant="ghost" type="button" className="text-xs text-muted-foreground w-full py-0 h-8 font-normal" onClick={switchPortal}>
                    {isAdminPortal ? "Go to Staff Portal →" : "Go to Admin Portal →"}
                  </Button>
                </div>
              </form>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
