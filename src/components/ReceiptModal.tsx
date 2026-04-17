import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { generateReceiptPdf, ReceiptData } from "@/lib/receipt";
import { useEffect, useRef, useState } from "react";

export default function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const doc = generateReceiptPdf(data);
    const blobUrl = URL.createObjectURL(doc.output("blob"));
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [data]);

  const print = () => iframeRef.current?.contentWindow?.print();
  const download = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${data.txId.slice(0, 8)}.pdf`;
    a.click();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Receipt · {data.customer.name}</DialogTitle></DialogHeader>
        <div className="bg-muted rounded-md overflow-hidden h-[480px]">
          {url && <iframe ref={iframeRef} src={url} className="w-full h-full" title="receipt" />}
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1.5" /> Save PDF</Button>
          <Button onClick={print}><Printer className="h-4 w-4 mr-1.5" /> Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
