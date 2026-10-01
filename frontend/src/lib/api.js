// All backend calls live here. Vite proxies /api -> http://localhost:8000

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

export async function getHealth() {
  return parse(await fetch("/api/health"));
}

export async function uploadPdf(file) {
  const form = new FormData();
  form.append("file", file);
  return parse(await fetch("/api/upload", { method: "POST", body: form }));
}

// ---- STEP 5 ---------------------------------------------------------------
export async function askQuestion(docId, question) {
  // >>> SOLUTION: POST { doc_id, question } as JSON to /api/ask, return the parsed response
  return parse(
    await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id: docId, question }),
    })
  );
  // <<< SOLUTION
}
