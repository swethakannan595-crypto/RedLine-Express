import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { uploadPdf } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function UploadPanel({ doc, onReady }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onReady(await uploadPdf(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
        className={cn(
          "group flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all duration-300",
          dragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
        )}
      >
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300",
          busy ? "bg-primary/15" : "bg-muted group-hover:bg-primary/10"
        )}>
          {busy ? (
            <Loader2 className="size-5 animate-spin text-primary" />
          ) : (
            <Upload className="size-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">
            {busy ? "Reading and indexing…" : "Drop a PDF here"}
          </p>
          {!busy && (
            <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
          )}
        </div>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => inputRef.current?.click()}>
          Choose PDF
        </Button>
        <input ref={inputRef} type="file" accept="application/pdf" hidden onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in">
          <X className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {doc && (
        <Card className="flex items-start gap-3 p-3 animate-fade-in border-primary/20">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="size-4 text-primary" />
          </div>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{doc.filename}</p>
            <p className="text-xs text-muted-foreground">{doc.pages} pages · {doc.chunks} chunks indexed</p>
          </div>
        </Card>
      )}
    </div>
  );
}
