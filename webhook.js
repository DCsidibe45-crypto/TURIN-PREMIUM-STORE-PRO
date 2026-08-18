const http = require("http");

const PORT = process.env.PORT || 10000;
const VERIFY_TOKEN = "TURIN_PREMIUM_WEBHOOK_2026";

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/webhook")) {
    const url = new URL(req.url, `http://${req.headers.host}`);

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(challenge);
    } else {
      res.writeHead(403);
      res.end("Forbidden");
    }
    return;
  }

  if (req.method === "POST" && req.url.startsWith("/webhook")) {
    let body = "";

    req.on("data", chunk => {
      body += chunk;
    });

    req.on("end", () => {
      console.log("Webhook received:", body);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("EVENT_RECEIVED");
    });
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("TURIN PREMIUM STORE Web Service is live");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
