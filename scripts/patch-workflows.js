const https = require("https");
const http = require("http");

const N8N_BASE = "https://n8n.srv1149285.hstgr.cloud/api/v1/workflows";
const N8N_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjODY4Mzc3My1mNmExLTQ5OTAtOGIzZi0zMGNlOWEzMDQyNzgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiMmIyNWViMjctZjhkMS00ZDc0LTlkYTYtYzAzNjQzMzY3NjYwIiwiaWF0IjoxNzc2NjMzNTQzfQ.UhJLtjcZabmyt3PSfyzpYG-0NCZvfL01rfAsX-ZRy8k";
const SUP_URL = "https://fmdgeqywylldfomrhzfi.supabase.co";
const SUP_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZGdlcXl3eWxsZGZvbXJoemZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQwNTQ4MiwiZXhwIjoyMDkxOTgxNDgyfQ.xLPP--F-B5V2rraEn-Y5VD5SdVD6UK_ymoi0ju5qW4g";

const IDS = [
  "dfLj3flv82b9rSQm",
  "Vl4OAsRLrsYuqbbq",
  "iT5QM6aElaoULh9W",
  "GSq6wk6sktiPtioE",
];

function request(method, url, body, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "https:" ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        hostname: parsed.hostname,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          "X-N8N-API-KEY": N8N_KEY,
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(buf) });
          } catch {
            resolve({ status: res.statusCode, body: buf });
          }
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function injectValues(wf) {
  let str = JSON.stringify(wf);
  // Replace every occurrence of the env var expressions
  str = str.split("={{ $env.SUPABASE_URL }}").join("=" + SUP_URL);
  str = str.split("={{ $env.SUPABASE_SERVICE_KEY }}").join("=" + SUP_KEY);
  str = str.split("$env.SUPABASE_URL").join(SUP_URL);
  str = str.split("$env.SUPABASE_SERVICE_KEY").join(SUP_KEY);
  return JSON.parse(str);
}

async function run() {
  for (const id of IDS) {
    // 1. Fetch
    const get = await request("GET", `${N8N_BASE}/${id}`, null);
    if (get.status !== 200) {
      console.error(`GET ${id} failed: ${get.status}`);
      continue;
    }
    const wf = get.body;

    // 2. Inject values
    const patched = injectValues(wf);

    // 3. Build minimal PUT body (n8n requires name, nodes, connections, settings)
    const putBody = {
      name: patched.name,
      nodes: patched.nodes,
      connections: patched.connections,
      settings: patched.settings || { executionOrder: "v1" },
      staticData: patched.staticData || null,
    };

    // 4. PUT
    const put = await request("PUT", `${N8N_BASE}/${id}`, putBody);
    console.log(`${put.status} | ${id} | ${patched.name}`);
    if (put.status !== 200) {
      console.error("  Error:", JSON.stringify(put.body).slice(0, 300));
    }
  }
}

run().catch(console.error);
