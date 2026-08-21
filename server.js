const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const PORT = process.env.PORT || 3000;

/*
=========================================================
TURIN PREMIUM STORE
Serve the storefront
=========================================================
*/

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/*
=========================================================
META / WHATSAPP WEBHOOK VERIFICATION
=========================================================
*/

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/*
=========================================================
WHATSAPP WEBHOOK
=========================================================
*/

app.post("/webhook", (req, res) => {
  console.log(
    "WhatsApp webhook:",
    JSON.stringify(req.body, null, 2)
  );

  res.sendStatus(200);
});

/*
=========================================================
START SERVER
=========================================================
*/

app.listen(PORT, () => {
  console.log(`TURIN PREMIUM STORE running on port ${PORT}`);
});
