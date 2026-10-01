import { useEffect, useRef, useState } from "react";
import { Bus, Phone, Upload, Loader2 } from "lucide-react";
import Chat from "@/components/Chat";
import { getHealth, uploadPdf } from "@/lib/api";

export default function App() {
  const [doc, setDoc] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const started = useRef(false);
  const fileRef = useRef(null);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth(false));
  }, []);

  // Auto-load the bus policy PDF from /public so customers never upload anything
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = await fetch("/bus_ticket_faq.pdf");
        if (!res.ok) throw new Error("bus_ticket_faq.pdf not found in frontend/public");
        const blob = await res.blob();
        const file = new File([blob], "bus_ticket_faq.pdf", { type: "application/pdf" });
        setDoc(await uploadPdf(file));
        setStatus("ready");
      } catch (e) {
        setError(e.message || "Could not load the policy. Is the backend running?");
        setStatus("error");
      }
    })();
  }, []);

  // Admin: replace the policy document
  async function onAdminFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("loading");
    try {
      setDoc(await uploadPdf(file));
      setStatus("ready");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
    e.target.value = "";
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between bg-gradient-to-r from-red-700 to-primary px-5 py-3 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
            <Bus className="size-5 text-primary" />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-bold tracking-tight">RedLine Express</h1>
            <p className="text-xs text-red-100">Bus Ticket Help Center</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 sm:flex">
            <Phone className="size-3.5" /> 1800-000-0000
          </span>
          {health && (
            <span className="hidden items-center gap-1.5 text-xs text-red-100 md:flex">
              <span className="h-2 w-2 rounded-full bg-green-300" /> AI online
            </span>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={onAdminFile} />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15"
            title="Admin: replace the policy document"
          >
            {status === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
            Update policy
          </button>
        </div>
      </header>

      <main className="chat-bg min-h-0 flex-1">
        <Chat doc={doc} status={status} error={error} />
      </main>
    </div>
  );
}