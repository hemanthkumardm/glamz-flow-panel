import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { inr } from "@/lib/format";
import { format } from "date-fns";

interface Props {
  bill: {
    id: string;
    total: number;
    wallet_amount?: number;
    created_at: string;
    customer_name?: string;
  } | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function VoidBillDialog({ bill, busy, onClose, onConfirm }: Props) {
  return (
    <AlertDialog open={!!bill} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void this bill?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              {bill && (
                <>
                  <p>
                    <span className="font-medium text-foreground">{bill.customer_name || "Walk-in"}</span>
                    {" · "}{inr(bill.total)}
                    {" · "}{format(new Date(bill.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                  <p>The bill will be marked void and removed from revenue totals.</p>
                  {Number(bill.wallet_amount) > 0 && (
                    <p>Wallet payment of <span className="font-medium text-foreground">{inr(bill.wallet_amount!)}</span> will be returned to the customer.</p>
                  )}
                  <p>Cash and UPI must be refunded manually at the counter.</p>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={busy}
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
          >
            {busy ? "Voiding…" : "Void bill"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}