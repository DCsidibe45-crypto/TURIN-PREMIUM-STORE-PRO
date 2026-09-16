const express = require("express"); const path = require("path"); const fs = require("fs"); const crypto = require("crypto");
const app = express();
const PORT = process.env.PORT || 3000; const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || "https://turin-premium-store-pro-api.onrender.com";
const CLICKPESA_CLIENT_ID = process.env.CLICKPESA_CLIENT_ID || "";
const CLICKPESA_API_KEY = process.env.CLICKPESA_API_KEY || "";
const CLICKPESA_BASE_URL = process.env.CLICKPESA_BASE_URL || "https://api.clickpesa.com";
const TZS_PER_USD = Number( process.env.TZS_PER_USD || 2550 );
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
const WHATSAPP_BUSINESS_NUMBER = process.env.WHATSAPP_BUSINESS_NUMBER || "255797955045";
const ORDERS_FILE = path.join(__dirname, "orders.json");
/* ========================================================= TURIN PREMIUM STORE SERVER / API ========================================================= */
app.disable("x-powered-by");
/* --------------------------------------------------------- PRODUCT CATALOGUE Server-side prices are authoritative. --------------------------------------------------------- */
const products = [ { id: 0, name: "Apple iPhone 14 128GB", priceTZS: 1540000 }, { id: 1, name: "Apple iPhone 14 Pro", priceTZS: 2000000 }, { id: 2, name: "Apple iPhone 14 Pro Max", priceTZS: 2150000 }, { id: 3, name: "Apple iPhone 15 Pro", priceTZS: 3200000 }, { id: 4, name: "Apple iPhone 15 Pro Max", priceTZS: 3500000 }, { id: 5, name: "Apple iPhone 11 Pro Max", priceTZS: 2800000 }, { id: 6, name: "Samsung Galaxy S20 Plus", priceTZS: 600000 }, { id: 7, name: "Samsung Galaxy S20 Ultra", priceTZS: 750000 }, { id: 8, name: "Samsung Galaxy S21 Ultra", priceTZS: 880000 }, { id: 9, name: "Samsung Galaxy S22 Ultra", priceTZS: 1330000 }, { id: 10, name: "Samsung Galaxy S23 Ultra", priceTZS: 1980000 }, { id: 11, name: "Samsung Galaxy S24 Ultra", priceTZS: 2580000 }, { id: 12, name: "Google Pixel 7", priceTZS: 600000 }, { id: 13, name: "Google Pixel 7a", priceTZS: 590000 }, { id: 14, name: "Google Pixel 7 Pro", priceTZS: 770000 }, { id: 15, name: "Google Pixel 8 Pro", priceTZS: 1200000 }, { id: 16, name: "Oraimo FreePods Pro", priceTZS: 165000 }, { id: 17, name: "Oraimo Shark 4", priceTZS: 55000 }, { id: 18, name: "JBL Boombox 3", priceTZS: 1300000 }, { id: 19, name: "JBL Charge 5", priceTZS: 400000 }, { id: 20, name: "JBL Clip 5", priceTZS: 190000 }, { id: 21, name: "JBL Flip 6", priceTZS: 290000 }, { id: 22, name: "JBL Go 4", priceTZS: 160000 }, { id: 23, name: "JBL Tune 510BT", priceTZS: 30000 }, { id: 24, name: "Oraimo Smart Clipper 2 Gold", priceTZS: 95000 }, { id: 25, name: "Oraimo Smart Blender", priceTZS: 130000 }, { id: 26, name: "Apple iPad Pro 12.9-inch 128GB", priceTZS: 2150000 }, { id: 27, name: "4G Wireless Router", priceTZS: 150000 }, { id: 28, name: "Airtel 5G SmartBox Router", priceTZS: 110000 }, { id: 29, name: "Aborder 1.8L 4-in-1 Juice Extractor", priceTZS: 115000 }, { id: 30, name: "Aborder 2L Electric Kettle", priceTZS: 32000 }, { id: 31, name: "Lenovo ThinkPad E14 Gen 2", priceTZS: 2490000 }, { id: 32, name: "Lenovo ThinkPad E14 Gen 5", priceTZS: 2250000 }, { id: 33, name: "Microsoft Surface Laptop 3", priceTZS: 1250000 }, { id: 34, name: "iPhone 16", priceTZS: 2600000 }, { id: 35, name: "iPhone 17", priceTZS: 3500000 }, { id: 36, name: "iPhone 17 Pro Max", priceTZS: 5350000 }, { id: 37, name: "Samsung Galaxy A17", priceTZS: 520000 }, { id: 38, name: "Samsung Galaxy A07s", priceTZS: 380000 }, { id: 39, name: "Tecno Camon 20 Pro 8+256GB", priceTZS: 585000 } ];
/* ========================================================= HELPERS ========================================================= */
function ensureOrdersFile() { if (!fs.existsSync(ORDERS_FILE)) { fs.writeFileSync( ORDERS_FILE, JSON.stringify([], null, 2), "utf8" ); } }
function readOrders() { ensureOrdersFile();
try { const data = fs.readFileSync( ORDERS_FILE, "utf8" );
return JSON.parse(data || "[]");
} catch (error) { console.error("Unable to read orders:", error); return []; } }
function writeOrders(orders) { fs.writeFileSync( ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8" ); }
function createOrderReference() { const date = new Date() .toISOString() .slice(0, 10) .replace(/-/g, "");
const random = crypto .randomBytes(3) .toString("hex") .toUpperCase();
return TURIN-${date}-${random}; }
function cleanText(value, max = 500) { if ( value === undefined || value === null ) { return ""; }
return String(value) .trim() .slice(0, max); }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+.[^\s@]+$/.test( email ); }
function normaliseItems(items) { if ( !Array.isArray(items) || !items.length ) { throw new Error("Cart is empty."); }
return items.map((item) => { const productId = Number( item.productId );
const quantity = Number(
  item.quantity
);

if (
  !Number.isInteger(productId) ||
  productId < 0 ||
  productId >= products.length
) {
  throw new Error("Invalid product.");
}

if (
  !Number.isInteger(quantity) ||
  quantity < 1 ||
  quantity > 99
) {
  throw new Error(
    "Invalid product quantity."
  );
}

const product = products[productId];

return {
  productId,
  name: product.name,
  quantity,
  unitPriceTZS: product.priceTZS,
  totalTZS:
    product.priceTZS * quantity
};
}); }
function calculateTotal(items) { return items.reduce( (total, item) => total + item.totalTZS, 0 ); }
/* --------------------------------------------------------- CUSTOMER VALIDATION Accepts both the checkout field format and simplified customer-name format. --------------------------------------------------------- */
function validateCustomer(customer) { const data = customer || {};
let firstName = cleanText( data.firstName, 100 );
let lastName = cleanText( data.lastName, 100 );
const fullName = cleanText( data.name || data.customerName, 200 );
if ( (!firstName || !lastName) && fullName ) { const parts = fullName .split(/\s+/) .filter(Boolean);
firstName =
  parts.shift() || "";

lastName =
  parts.join(" ") || "Customer";
}
const email = cleanText( data.email || data.customerEmail, 180 );
const phone = cleanText( data.phone || data.customerPhone, 60 );
const country = cleanText( data.country || data.shipping?.country, 100 );
const city = cleanText( data.city || data.shipping?.city, 100 );
const address = cleanText( data.address || data.shipping?.address, 300 );
if (!firstName) { throw new Error( "First name is required." ); }
if (!lastName) { lastName = "Customer"; }
if (!isValidEmail(email)) { throw new Error( "A valid email address is required." ); }
if (!phone) { throw new Error( "Phone / WhatsApp number is required." ); }
return { firstName, lastName, email, phone, country, city, state: cleanText( data.state || data.stateProvince || data.shipping?.state, 100 ), address, postal: cleanText( data.postal || data.postalCode || data.shipping?.postal, 30 ), company: cleanText( data.company, 150 ), taxId: cleanText( data.taxId, 100 ), notes: cleanText( data.notes, 1000 ) }; }
function saveOrder(order) { const orders = readOrders();
orders.push(order);
writeOrders(orders);
return order; }
function findOrder(reference) { return readOrders().find( (order) => order.reference === reference ); }
function updateOrder( reference, updates ) { const orders = readOrders();
const index = orders.findIndex( (order) => order.reference === reference );
if (index === -1) { return null; }
orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
writeOrders(orders);
return orders[index]; }
function tzsToUsd(tzs) { return Number( (tzs / TZS_PER_USD).toFixed(2) ); }
/* ========================================================= CLICKPESA Hosted Checkout ========================================================= */
async function getClickPesaAccessToken() { if ( !CLICKPESA_CLIENT_ID || !CLICKPESA_API_KEY ) { throw new Error( "ClickPesa is not configured. Add CLICKPESA_CLIENT_ID and CLICKPESA_API_KEY in Render Environment Variables." ); }
const response = await fetch( ${CLICKPESA_BASE_URL}/third-parties/generate-token, { method: "POST", headers: { "api-key": CLICKPESA_API_KEY, "client-id": CLICKPESA_CLIENT_ID } } );
const data = await response.json();
if ( !response.ok || !data.success || !data.token ) { console.error( "ClickPesa token error:", data );
throw new Error(
  data?.message ||
    "Unable to authenticate with ClickPesa."
);
}
return data.token; }
async function createClickPesaCheckout( order ) { const accessToken = await getClickPesaAccessToken();
const customerName = ${order.customer.firstName} ${order.customer.lastName}.trim();
const payload = { totalPrice: String(order.totalTZS), orderReference: order.reference, orderCurrency: "TZS", customerName, customerEmail: order.customer.email, customerPhone: order.customer.phone.replace( /^+/, "" ), description: TURIN PREMIUM STORE Order ${order.reference} };
const response = await fetch( ${CLICKPESA_BASE_URL}/third-parties/checkout-link/generate-checkout-url, { method: "POST", headers: { Authorization: accessToken, "Content-Type": "application/json" }, body: JSON.stringify( payload ) } );
const data = await response.json();
if ( !response.ok || !data.checkoutLink ) { console.error( "ClickPesa checkout error:", data );
throw new Error(
  data?.message ||
    "ClickPesa could not create the checkout."
);
}
return data; }
/* ========================================================= NORMAL JSON ========================================================= */
app.use( express.json({ limit: "1mb" }) );
/* ========================================================= CORS ========================================================= */
app.use( (req, res, next) => { res.setHeader( "Access-Control-Allow-Origin", "*" );
res.setHeader(
  "Access-Control-Allow-Methods",
  "GET,POST,OPTIONS"
);

res.setHeader(
  "Access-Control-Allow-Headers",
  "Content-Type, Authorization"
);

if (
  req.method === "OPTIONS"
) {
  return res.sendStatus(204);
}

next();
} );
/* ========================================================= SECURITY HEADERS ========================================================= */
app.use( (req, res, next) => { res.setHeader( "X-Content-Type-Options", "nosniff" );
res.setHeader(
  "X-Frame-Options",
  "SAMEORIGIN"
);

res.setHeader(
  "Referrer-Policy",
  "strict-origin-when-cross-origin"
);

next();
} );
/* ========================================================= HEALTH CHECK ========================================================= */
app.get( "/api/health", (req, res) => { res.json({ ok: true, service: "TURIN PREMIUM STORE", status: "online", time: new Date().toISOString(), clickpesaConfigured: Boolean( CLICKPESA_CLIENT_ID && CLICKPESA_API_KEY ) }); } );
/* ========================================================= PRODUCT API ========================================================= */
app.get( "/api/products", (req, res) => { res.json({ ok: true, products }); } );
/* ========================================================= CREATE ORDER ========================================================= */
app.post( "/api/orders", (req, res) => { try { const customer = validateCustomer( req.body.customer );
const items =
    normaliseItems(
      req.body.items
    );

  const totalTZS =
    calculateTotal(items);

  const reference =
    createOrderReference();

  const order = {
    reference,
    status:
      "pending_confirmation",
    paymentStatus:
      "unpaid",
    paymentProvider:
      null,
    paymentId:
      null,
    currency:
      cleanText(
        req.body.currency,
        10
      ) || "TZS",
    customer,
    items,
    totalTZS,
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    source: "website"
  };

  saveOrder(order);

  return res
    .status(201)
    .json({
      ok: true,
      order: {
        reference,
        totalTZS,
        status:
          order.status
      }
    });
} catch (error) {
  console.error(
    "Create order error:",
    error
  );

  return res
    .status(400)
    .json({
      ok: false,
      error:
        error.message
    });
}
} );
/* ========================================================= CLICKPESA CREATE CHECKOUT ========================================================= */
app.post( "/api/payments/clickpesa/create", async (req, res) => { try { const customer = validateCustomer( req.body.customer );
const items =
    normaliseItems(
      req.body.items
    );

  const totalTZS =
    calculateTotal(items);

  const reference =
    createOrderReference();

  const order = {
    reference,
    status:
      "payment_pending",
    paymentStatus:
      "unpaid",
    paymentProvider:
      "clickpesa",
    paymentId:
      null,
    currency:
      "TZS",
    customer,
    items,
    totalTZS,
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    source:
      "website"
  };

  saveOrder(order);

  const checkout =
    await createClickPesaCheckout(
      order
    );

  updateOrder(
    reference,
    {
      paymentStatus:
        "checkout_created",
      paymentProvider:
        "clickpesa",
      clickpesaClientId:
        checkout.clientId ||
        CLICKPESA_CLIENT_ID
    }
  );

  return res.json({
    ok: true,
    provider:
      "clickpesa",
    orderReference:
      reference,
    checkoutLink:
      checkout.checkoutLink,
    url:
      checkout.checkoutLink
  });
} catch (error) {
  console.error(
    "ClickPesa create error:",
    error
  );

  return res
    .status(400)
    .json({
      ok: false,
      error:
        error.message
    });
}
} );
/* ========================================================= CLICKPESA WEBHOOK PAYMENT RECEIVED / PAYMENT FAILED ========================================================= */
app.post( "/api/clickpesa/webhook", (req, res) => { try { const payload = req.body || {};
console.log(
    "ClickPesa webhook:",
    JSON.stringify(
      payload,
      null,
      2
    )
  );

  const event =
    cleanText(
      payload.event,
      100
    );

  const data =
    payload.data || {};

  const reference =
    cleanText(
      data.orderReference,
      150
    );

  if (!reference) {
    return res
      .status(200)
      .json({
        received: true
      });
  }

  if (
    event ===
    "PAYMENT RECEIVED"
  ) {
    updateOrder(
      reference,
      {
        status:
          "confirmed",
        paymentStatus:
          data.status ===
          "SUCCESS"
            ? "paid"
            : "payment_received",
        paymentProvider:
          "clickpesa",
        paymentId:
          data.paymentReference ||
          data.id ||
          null,
        clickpesaStatus:
          data.status ||
          null,
        clickpesaPaymentReference:
          data.paymentReference ||
          null,
        clickpesaAmount:
          data.collectedAmount ||
          null,
        clickpesaCurrency:
          data.collectedCurrency ||
          null,
        clickpesaChannel:
          data.channel ||
          null,
        clickpesaMessage:
          data.message ||
          null
      }
    );

    console.log(
      `ClickPesa payment received for ${reference}`
    );
  }

  if (
    event ===
    "PAYMENT FAILED"
  ) {
    updateOrder(
      reference,
      {
        paymentStatus:
          "failed",
        paymentProvider:
          "clickpesa",
        paymentId:
          data.paymentReference ||
          data.id ||
          null,
        clickpesaStatus:
          data.status ||
          "FAILED",
        clickpesaMessage:
          data.message ||
          null
      }
    );

    console.log(
      `ClickPesa payment failed for ${reference}`
    );
  }

  return res
    .status(200)
    .json({
      received: true
    });
} catch (error) {
  console.error(
    "ClickPesa webhook error:",
    error
  );

  return res
    .status(200)
    .json({
      received: true
    });
}
} );
/* ========================================================= ORDER LOOKUP ========================================================= */
app.get( "/api/orders/:reference", (req, res) => { const reference = cleanText( req.params.reference, 100 );
const order =
  findOrder(reference);

if (!order) {
  return res
    .status(404)
    .json({
      ok: false,
      error:
        "Order not found."
    });
}

return res.json({
  ok: true,
  order
});
} );
/* ========================================================= WHATSAPP VERIFICATION ========================================================= */
app.get( "/webhook", (req, res) => { const mode = req.query["hub.mode"];
const token =
  req.query[
    "hub.verify_token"
  ];

const challenge =
  req.query[
    "hub.challenge"
  ];

if (
  mode === "subscribe" &&
  token ===
    WHATSAPP_VERIFY_TOKEN
) {
  return res
    .status(200)
    .send(challenge);
}

return res.sendStatus(
  403
);
} );
/* ========================================================= WHATSAPP WEBHOOK ========================================================= */
app.post( "/webhook", (req, res) => { console.log( "WhatsApp webhook:", JSON.stringify( req.body, null, 2 ) );
return res.sendStatus(
  200
);
} );
/* ========================================================= WHATSAPP ORDER MESSAGE ========================================================= */
async function sendWhatsAppText( phone, message ) { if ( !WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID ) { return { configured: false }; }
const response = await fetch( https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages, { method: "POST", headers: { Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { preview_url: false, body: message } }) } );
const data = await response.json();
if (!response.ok) { console.error( "WhatsApp send error:", data );
throw new Error(
  "WhatsApp message could not be sent."
);
}
return { configured: true, data }; }
app.post( "/api/orders/:reference/whatsapp", async (req, res) => { try { const reference = cleanText( req.params.reference, 100 );
const order =
    findOrder(reference);

  if (!order) {
    return res
      .status(404)
      .json({
        ok: false,
        error:
          "Order not found."
      });
  }

  const itemLines =
    order.items
      .map(
        (item) =>
          `${item.name} x${item.quantity}`
      )
      .join("\n");

  const message =
    `Hello TURIN PREMIUM STORE,\n\n` +
    `ORDER REQUEST: ${order.reference}\n\n` +
    `Customer: ${order.customer.firstName} ${order.customer.lastName}\n` +
    `Phone: ${order.customer.phone}\n` +
    `Email: ${order.customer.email}\n\n` +
    `Shipping:\n` +
    `${order.customer.address}, ${order.customer.city}, ` +
    `${
      order.customer.state
        ? order.customer.state +
          ", "
        : ""
    }` +
    `${order.customer.country}\n\n` +
    `Items:\n${itemLines}\n\n` +
    `Merchandise Total: TZS ${order.totalTZS.toLocaleString(
      "en-US"
    )}\n\n` +
    `Please confirm stock, shipping, final amount and payment instructions.`;

  const result =
    await sendWhatsAppText(
      WHATSAPP_BUSINESS_NUMBER,
      message
    );

  return res.json({
    ok: true,
    whatsapp:
      result
  });
} catch (error) {
  console.error(
    "WhatsApp order error:",
    error
  );

  return res
    .status(400)
    .json({
      ok: false,
      error:
        error.message
    });
}
} );
/* ========================================================= SERVE WEBSITE ========================================================= */
app.use( express.static( path.join(__dirname) ) );
app.get( "/", (req, res) => { res.sendFile( path.join( __dirname, "index.html" ) ); } );
/* ========================================================= 404 API HANDLER ========================================================= */
app.use( "/api", (req, res) => { return res .status(404) .json({ ok: false, error: "API endpoint not found." }); } );
/* ========================================================= GENERAL ERROR HANDLER ========================================================= */
app.use( ( error, req, res, next ) => { console.error( "Server error:", error );
if (
  res.headersSent
) {
  return next(error);
}

return res
  .status(500)
  .json({
    ok: false,
    error:
      "Internal server error."
  });
} );
/* ========================================================= START ========================================================= */
ensureOrdersFile();
app.listen( PORT, () => { console.log( "==========================================" );
console.log(
  "TURIN PREMIUM STORE"
);

console.log(
  `Server running on port ${PORT}`
);

console.log(
  `Public URL: ${PUBLIC_BASE_URL}`
);

console.log(
  `ClickPesa configured: ${Boolean(
    CLICKPESA_CLIENT_ID &&
    CLICKPESA_API_KEY
  )}`
);

console.log(
  "=========================================="
);
} );
