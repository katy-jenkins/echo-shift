import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CORRECT_PIN = "2468";
const STORAGE_KEY = "pin_unlocked";

export default function PinGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(STORAGE_KEY) === "true");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return children;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === CORRECT_PIN) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setUnlocked(true);
    } else {
      setError(true);
      setPin("");
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl shadow-sm p-8 w-full max-w-xs text-center space-y-5">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">PIN Required</h2>
          <p className="text-sm text-muted-foreground mt-1">Enter your PIN to access this page.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={8}
            placeholder="Enter PIN"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            className={`text-center tracking-widest text-lg ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">Incorrect PIN. Try again.</p>}
          <Button type="submit" className="w-full">Unlock</Button>
        </form>
      </div>
    </div>
  );
}