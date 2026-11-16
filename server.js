require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(["/health", "/api/health"], (req, res) => {
  res.status(200).json({
    ok: true,
    service: "TURIN PREMIUM STORE API",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

app.get("/webhook", (req, res) => {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;

  if (
    req.query["hub.mode"] === "subscribe" &&
    token &&
    req.query["hub.verify_token"] === token
  ) {
    return res.status(200).send(req.query["hub.challenge"]);
  }

  res.sendStatus(403);
});

app.post("/webhook", (req, res) => {
  console.log("Webhook event received");
  console.log(JSON.stringify(req.body));
  res.status(200).send("EVENT_RECEIVED");
});

app.get("/instagram/callback", (req, res) => {
  res.status(req.query.code ? 200 : 400).send(
    req.query.code
      ? "Instagram authorization received."
      : "Missing authorization code."
  );
});

app.use(express.static(path.join(__dirname)));

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("TURIN PREMIUM STORE API listening on " + PORT);
});
