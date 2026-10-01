import { useEffect, useRef, useState } from "react";
import {
  Send,
  Bus,
  User,
  Ban,
  CalendarClock,
  MapPin,
  Briefcase,
  CreditCard,
  Clock,
  FileText,
  ChevronDown,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { askQuestion } from "@/lib/api";
import BusArt from "@/components/BusArt";

const TOPICS = [
  { icon: Ban, title: "Cancel & refund", desc: "Charges, slabs and refund time", q: "How much is deducted if I cancel my ticket and when will I get my refund?" },
  { icon: CalendarClock, title: "Change travel date", desc: "Reschedule your journey", q: "Can I change my travel date after booking?" },
  { icon: MapPin, title: "Boarding point", desc: "Change where you board", q: "How can I change my boarding point?" },
  { icon: Briefcase, title: "Luggage rules", desc: "Weight limits and banned items", q: "How much luggage can I carry on the bus?" },
  { icon: CreditCard, title: "Payment issues", desc: "Money deducted, no ticket", q: "My money was deducted but I did not get a ticket. What should I do?" },
  { icon: Clock, title: "Bus cancelled or late", desc: "Delays and your options", q: "What happens if the bus is cancelled or delayed?" },
];

const QUICK = [
  "How do I cancel my ticket?",
  "Is a child ticket required?",
  "Which ID proofs are accepted?",
  "Can I transfer my ticket?",
];

/* ---- tiny markdown renderer: **bold**, bullets, *italic note* ---- */
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p.replace(/`/g, "")}</span>
    )
  );
}

function Answer({ text }) {
  const blocks = [];
  let list = [];
  const flush = () => {
    if (list.length) {
      blocks.push({ type: "ul", items: list });
      list = [];
    }
  };
  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) return flush();
    const b = line.match(/^[*-]\s+(.*)/);
    if (b) return list.push(b[1]);
    flush();
    const it = line.match(/^\*(?!\*)(.+?)\*$/);
    blocks.push(it ? { type: "note", text: it[1] } : { type: "p", text: line });
  });
  flush();

  return (
    <div className="space-y-2 text-[15px] leading-relaxed text-foreground/90">
      {blocks.map((b, i) =>
        b.type === "ul" ? (
          <ul key={i} className="space-y-1.5">
            {b.items.map((t, j) => (
              <li key={j} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{inline(t)}</span>
              </li>
            ))}
          </ul>
        ) : b.type === "note" ? (
          <p key={i} className="text-sm italic text-muted-foreground">{inline(b.text)}</p>
        ) : (
          <p key={i}>{inline(b.text)}</p>
        )
      )}
    </div>
  );
}

function Sources({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  const byPage = new Map();
  sources.forEach((s) => {
    if (!byPage.has(s.page) || s.score > byPage.get(s.page).score) byPage.set(s.page, s);
  });
  const pages = [...byPage.values()].sort((a, b) => a.page - b.page);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-100"
      >
        <FileText className="size-3.5" />
        From policy page {pages.map((p) => p.page).join(", ")}
        <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 animate-fade-in">
          {pages.map((s) => (
            <div key={s.page} className="rounded-xl border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-semibold text-red-700">Page {s.page}</p>
              <p className="line-clamp-4">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({ m }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end gap-3 animate-message-in">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[15px] text-primary-foreground shadow-sm">
          {m.content}
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
          <User className="size-4 text-red-700" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-message-in">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary shadow-sm">
        <Bus className="size-4 text-primary-foreground" />
      </div>
      <div className={`max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-4 py-3 shadow-sm ${m.error ? "border-destructive/40" : "border-border"}`}>
        {m.error ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="size-4" /> {m.content}
          </p>
        ) : (
          <>
            <Answer text={m.content} />
            <Sources sources={m.sources} />
          </>
        )}
      </div>
    </div>
  );
}

export default function Chat({ doc, status, error }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const ready = status === "ready" && !!doc;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  async function send(q) {
    const question = (q ?? input).trim();
    if (!question || busy || !ready) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const data = await askQuestion(doc.doc_id, question);
      setMessages((m) => [...m, { role: "assistant", content: data.answer, sources: data.sources }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", error: true, content: e.message || "Something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  const started = messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 overflow-y-auto">
        {!started ? (
          <div className="mx-auto max-w-5xl px-5 py-8 animate-fade-in">
            {/* Hero */}
            <section className="grid items-center gap-6 overflow-hidden rounded-3xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-red-50 p-6 md:grid-cols-2 md:p-10">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-sm">
                  <span className={`h-2 w-2 rounded-full ${ready ? "bg-green-500" : "bg-amber-400 animate-pulse"}`} />
                  {ready ? "Help desk is online" : status === "error" ? "Help desk offline" : "Getting things ready..."}
                </span>
                <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight text-foreground md:text-4xl">
                  Got a doubt about your <span className="text-primary">bus ticket</span>?
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Ask about cancellations, refunds, boarding points, luggage or delays. Answers come straight from the official policy.
                </p>
                {status === "error" && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    {error || "Could not load the policy document."}
                  </p>
                )}
                {status === "loading" && (
                  <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" /> Loading the policy document...
                  </p>
                )}
              </div>
              <BusArt className="mx-auto w-full max-w-md" />
            </section>

            {/* Topic cards */}
            <h3 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Popular topics
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TOPICS.map(({ icon: Icon, title, desc, q }) => (
                <button
                  key={title}
                  disabled={!ready}
                  onClick={() => send(q)}
                  className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-red-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-foreground">{title}</span>
                    <span className="block text-sm text-muted-foreground">{desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5 px-5 py-6">
            {messages.map((m, i) => (
              <Bubble key={i} m={m} />
            ))}
            {busy && (
              <div className="flex gap-3 animate-message-in">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                  <Bus className="size-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3">
                  <div className="thinking-dots flex gap-1.5"><span /><span /><span /></div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          {started && (
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {QUICK.map((q) => (
                <button
                  key={q}
                  disabled={!ready || busy}
                  onClick={() => send(q)}
                  className="shrink-0 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-sm focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={!ready}
              placeholder={ready ? "Type your ticket doubt here..." : "Setting up the help desk..."}
              className="flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            />
            <button
              onClick={() => send()}
              disabled={!ready || busy || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-red-700 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}