const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  "https://turin-premium-store-pro-api.onrender.com";

const TZS_PER_USD = Number(process.env.TZS_PER_USD || 2550);

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "";
const PAYPAL_BASE_URL =
  process.env.PAYPAL_BASE_URL || "https://api-m.sandbox.paypal.com";

const WHATSAPP_VERIFY_TOKEN =
  process.env.WHATSAPP_VERIFY_TOKEN || "";

const WHATSAPP_ACCESS_TOKEN =
  process.env.WHATSAPP_ACCESS_TOKEN || "";

const WHATSAPP_PHONE_NUMBER_ID =
  process.env.WHATSAPP_PHONE_NUMBER_ID || "";

const WHATSAPP_BUSINESS_NUMBER =
  process.env.WHATSAPP_BUSINESS_NUMBER || "255797955045";

const ORDERS_FILE = path.join(__dirname, "orders.json");

/* =========================================================
   TURIN PREMIUM STORE
   SERVER / API
========================================================= */

app.disable("x-powered-by");

/* ---------------------------------------------------------
   PRODUCT CATALOGUE
   Server-side prices are authoritative.
--------------------------------------------------------- */

const products = [
  {
    id: 0,
    name: "Apple iPhone 14 128GB",
    priceTZS: 1540000
  },
  {
    id: 1,
    name: "Apple iPhone 14 Pro",
    priceTZS: 2000000
  },
  {
    id: 2,
    name: "Apple iPhone 14 Pro Max",
    priceTZS: 2150000
  },
  {
    id: 3,
    name: "Apple iPhone 15 Pro",
    priceTZS: 3200000
  },
  {
    id: 4,
    name: "Apple iPhone 15 Pro Max",
    priceTZS: 3500000
  },
  {
    id: 5,
    name: "Apple iPhone 11 Pro Max",
    priceTZS: 2800000
  },
  {
    id: 6,
    name: "Samsung Galaxy S20 Plus",
    priceTZS: 600000
  },
  {
    id: 7,
    name: "Samsung Galaxy S20 Ultra",
    priceTZS: 750000
  },
  {
    id: 8,
    name: "Samsung Galaxy S21 Ultra",
    priceTZS: 880000
  },
  {
    id: 9,
    name: "Samsung Galaxy S22 Ultra",
    priceTZS: 1330000
  },
  {
    id: 10,
    name: "Samsung Galaxy S23 Ultra",
    priceTZS: 1980000
  },
  {
    id: 11,
    name: "Samsung Galaxy S24 Ultra",
    priceTZS: 2580000
  },
  {
    id: 12,
    name: "Google Pixel 7",
    priceTZS: 600000
  },
  {
    id: 13,
    name: "Google Pixel 7a",
    priceTZS: 590000
  },
  {
    id: 14,
    name: "Google Pixel 7 Pro",
    priceTZS: 770000
  },
  {
    id: 15,
    name: "Google Pixel 8 Pro",
    priceTZS: 1200000
  },
  {
    id: 16,
    name: "Oraimo FreePods Pro",
    priceTZS: 165000
  },
  {
    id: 17,
    name: "Oraimo Shark 4",
    priceTZS: 55000
  },
  {
    id: 18,
    name: "JBL Boombox 3",
    priceTZS: 1300000
  },
  {
    id: 19,
    name: "JBL Charge 5",
    priceTZS: 400000
  },
  {
    id: 20,
    name: "JBL Clip 5",
    priceTZS: 190000
  },
  {
    id: 21,
    name: "JBL Flip 6",
    priceTZS: 290000
  },
  {
    id: 22,
    name: "JBL Go 4",
    priceTZS: 160000
  },
  {
    id: 23,
    name: "JBL Tune 510BT",
    priceTZS: 30000
  },
  {
    id: 24,
    name: "Oraimo Smart Clipper 2 Gold",
    priceTZS: 95000
  },
  {
    id: 25,
    name: "Oraimo Smart Blender",
    priceTZS: 130000
  },
  {
    id: 26,
    name: "Apple iPad Pro 12.9-inch 128GB",
    priceTZS: 2150000
  },
  {
    id: 27,
    name: "4G Wireless Router",
    priceTZS: 150000
  },
  {
    id: 28,
    name: "Airtel 5G SmartBox Router",
    priceTZS: 110000
  },
  {
    id: 29,
    name: "Aborder 1.8L 4-in-1 Juice Extractor",
    priceTZS: 115000
  },
  {
    id: 30,
    name: "Aborder 2L Electric Kettle",
    priceTZS: 32000
  },
  {
    id: 31,
    name: "Lenovo ThinkPad E14 Gen 2",
    priceTZS: 2490000
  },
  {
    id: 32,
    name: "Lenovo ThinkPad E14 Gen 5",
    priceTZS: 2250000
  },
  {
    id: 33,
    name: "Microsoft Surface Laptop 3",
    priceTZS: 1250000
  },
  {
    id: 34,
    name: "iPhone 16",
    priceTZS: 2600000
  },
  {
    id: 35,
    name: "iPhone 17",
    priceTZS: 3500000
  },
  {
    id: 36,
    name: "iPhone 17 Pro Max",
    priceTZS: 5350000
  },
  {
    id: 37,
    name: "Samsung Galaxy A17",
    priceTZS: 520000
  },
  {
    id: 38,
    name: "Samsung Galaxy A07s",
    priceTZS: 380000
  },
  {
    id: 39,
    name: "Tecno Camon 20 Pro 8+256GB",
    priceTZS: 585000
  }
];

/* =========================================================
   HELPERS
========================================================= */

function ensureOrdersFile() {
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(
      ORDERS_FILE,
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
}

function readOrders() {
  ensureOrdersFile();

  try {
    const data = fs.readFileSync(ORDERS_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Unable to read orders:", error);
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(
    ORDERS_FILE,
    JSON.stringify(orders, null, 2),
    "utf8"
  );
}

function createOrderReference() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  const random = crypto.randomBytes(3).toString("hex").toUpperCase();

  return `TURIN-${date}-${random}`;
}

function cleanText(value, max = 500) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, max);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normaliseItems(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Cart is empty.");
  }

  return items.map((item) => {
    const productId = Number(item.productId);
    const quantity = Number(item.quantity);

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
      throw new Error("Invalid product quantity.");
    }

    const product = products[productId];

    return {
      productId,
      name: product.name,
      quantity,
      unitPriceTZS: product.priceTZS,
      totalTZS: product.priceTZS * quantity
    };
  });
}

function calculateTotal(items) {
  return items.reduce(
    (total, item) => total + item.totalTZS,
    0
  );
}

function validateCustomer(customer) {
  const data = customer || {};

  const firstName = cleanText(data.firstName, 100);
  const lastName = cleanText(data.lastName, 100);
  const email = cleanText(data.email, 180);
  const phone = cleanText(data.phone, 60);
  const country = cleanText(data.country, 100);
  const city = cleanText(data.city, 100);
  const address = cleanText(data.address, 300);

  if (!firstName) {
    throw new Error("First name is required.");
  }

  if (!lastName) {
    throw new Error("Last name is required.");
  }

  if (!isValidEmail(email)) {
    throw new Error("A valid email address is required.");
  }

  if (!phone) {
    throw new Error("Phone / WhatsApp number is required.");
  }

  if (!country) {
    throw new Error("Country is required.");
  }

  if (!city) {
    throw new Error("City is required.");
  }

  if (!address) {
    throw new Error("Street address is required.");
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    country,
    city,
    state: cleanText(data.state, 100),
    address,
    postal: cleanText(data.postal, 30),
    company: cleanText(data.company, 150),
    taxId: cleanText(data.taxId, 100),
    notes: cleanText(data.notes, 1000)
  };
}

function saveOrder(order) {
  const orders = readOrders();

  orders.push(order);

  writeOrders(orders);

  return order;
}

function findOrder(reference) {
  return readOrders().find(
    (order) => order.reference === reference
  );
}

function updateOrder(reference, updates) {
  const orders = readOrders();

  const index = orders.findIndex(
    (order) => order.reference === reference
  );

  if (index === -1) {
    return null;
  }

  orders[index] = {
    ...orders[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  writeOrders(orders);

  return orders[index];
}

function tzsToUsd(tzs) {
  return Number((tzs / TZS_PER_USD).toFixed(2));
}

/* =========================================================
   STRIPE HELPERS
========================================================= */

async function createStripeCheckout(order) {
  if (!STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured. Add STRIPE_SECRET_KEY in Render Environment Variables."
    );
  }

  const params = new URLSearchParams();

  params.append("mode", "payment");

  params.append(
    "success_url",
    `${PUBLIC_BASE_URL}/payment-success.html?provider=stripe&order=${encodeURIComponent(
      order.reference
    )}`
  );

  params.append(
    "cancel_url",
    `${PUBLIC_BASE_URL}/?payment=cancelled&order=${encodeURIComponent(
      order.reference
    )}`
  );

  params.append(
    "customer_email",
    order.customer.email
  );

  params.append(
    "metadata[order_reference]",
    order.reference
  );

  params.append(
    "metadata[customer_country]",
    order.customer.country
  );

  order.items.forEach((item, index) => {
    const usd = tzsToUsd(item.unitPriceTZS);

    params.append(
      `line_items[${index}][price_data][currency]`,
      "usd"
    );

    params.append(
      `line_items[${index}][price_data][product_data][name]`,
      item.name
    );

    params.append(
      `line_items[${index}][price_data][product_data][description]`,
      `TURIN PREMIUM STORE Order ${order.reference}`
    );

    params.append(
      `line_items[${index}][price_data][unit_amount]`,
      String(Math.round(usd * 100))
    );

    params.append(
      `line_items[${index}][quantity]`,
      String(item.quantity)
    );
  });

  const response = await fetch(
    "https://api.stripe.com/v1/checkout/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: params.toString()
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Stripe error:", data);

    throw new Error(
      data?.error?.message ||
        "Stripe could not create the payment session."
    );
  }

  return data;
}

/* =========================================================
   PAYPAL HELPERS
========================================================= */

async function getPayPalAccessToken() {
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error(
      "PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Render."
    );
  }

  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type":
          "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal token error:", data);

    throw new Error(
      "Unable to authenticate with PayPal."
    );
  }

  return data.access_token;
}

async function createPayPalOrder(order) {
  const accessToken = await getPayPalAccessToken();

  const amountUSD = tzsToUsd(order.totalTZS);

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        intent: "CAPTURE",

        purchase_units: [
          {
            reference_id: order.reference,

            description:
              "TURIN PREMIUM STORE International Order",

            custom_id: order.reference,

            amount: {
              currency_code: "USD",
              value: amountUSD.toFixed(2)
            }
          }
        ],

        application_context: {
          brand_name: "TURIN PREMIUM STORE",
          user_action: "PAY_NOW",

          return_url:
            `${PUBLIC_BASE_URL}/api/payments/paypal/return?order=` +
            encodeURIComponent(order.reference),

          cancel_url:
            `${PUBLIC_BASE_URL}/?payment=cancelled&order=` +
            encodeURIComponent(order.reference)
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal create order error:", data);

    throw new Error(
      data?.message ||
        "PayPal could not create the payment order."
    );
  }

  return data;
}

function getPayPalApproveUrl(data) {
  if (!data || !Array.isArray(data.links)) {
    return null;
  }

  const approve = data.links.find(
    (link) => link.rel === "approve"
  );

  return approve ? approve.href : null;
}

async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(
      paypalOrderId
    )}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal capture error:", data);

    throw new Error(
      data?.message ||
        "PayPal payment capture failed."
    );
  }

  return data;
}

/* =========================================================
   STRIPE WEBHOOK SIGNATURE
========================================================= */

function verifyStripeSignature(payload, signature) {
  if (!STRIPE_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const elements = signature.split(",");

  let timestamp = null;
  const signatures = [];

  for (const element of elements) {
    const [key, value] = element.split("=");

    if (key === "t") {
      timestamp = value;
    }

    if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!timestamp || !signatures.length) {
    return false;
  }

  const signedPayload =
    `${timestamp}.${payload.toString("utf8")}`;

  const expected = crypto
    .createHmac(
      "sha256",
      STRIPE_WEBHOOK_SECRET
    )
    .update(signedPayload)
    .digest("hex");

  return signatures.some((signatureValue) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signatureValue)
      );
    } catch {
      return false;
    }
  });
}

/* =========================================================
   STRIPE WEBHOOK
   MUST BE BEFORE express.json()
========================================================= */

app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const signature =
      req.headers["stripe-signature"];

    if (
      STRIPE_WEBHOOK_SECRET &&
      !verifyStripeSignature(
        req.body,
        signature
      )
    ) {
      return res
        .status(400)
        .json({
          error: "Invalid Stripe webhook signature."
        });
    }

    let event;

    try {
      event = JSON.parse(
        req.body.toString("utf8")
      );
    } catch {
      return res
        .status(400)
        .json({
          error: "Invalid webhook JSON."
        });
    }

    console.log(
      "Stripe webhook:",
      event.type
    );

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      const session = event.data.object;

      const reference =
        session.metadata?.order_reference;

      if (reference) {
        updateOrder(reference, {
          paymentStatus: "paid",
          paymentProvider: "stripe",
          paymentId: session.id
        });
      }
    }

    return res.json({ received: true });
  }
);

/* =========================================================
   NORMAL JSON
========================================================= */

app.use(express.json({ limit: "1mb" }));

/* =========================================================
   CORS
========================================================= */

app.use((req, res, next) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {
  res.setHeader(
    "X-Content-Type-Options",
    "nosniff"
  );

  res.setHeader(
    "X-Frame-Options",
    "SAMEORIGIN"
  );

  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );

  next();
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "TURIN PREMIUM STORE",
    status: "online",
    time: new Date().toISOString(),
    stripeConfigured: Boolean(
      STRIPE_SECRET_KEY
    ),
    paypalConfigured: Boolean(
      PAYPAL_CLIENT_ID &&
      PAYPAL_CLIENT_SECRET
    )
  });
});

/* =========================================================
   PRODUCT API
========================================================= */

app.get("/api/products", (req, res) => {
  res.json({
    ok: true,
    products
  });
});

/* =========================================================
   CREATE ORDER
========================================================= */

app.post("/api/orders", (req, res) => {
  try {
    const customer =
      validateCustomer(req.body.customer);

    const items =
      normaliseItems(req.body.items);

    const totalTZS =
      calculateTotal(items);

    const reference =
      createOrderReference();

    const order = {
      reference,

      status: "pending_confirmation",

      paymentStatus: "unpaid",

      paymentProvider: null,

      paymentId: null,

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

    return res.status(201).json({
      ok: true,
      order: {
        reference,
        totalTZS,
        status: order.status
      }
    });
  } catch (error) {
    console.error(
      "Create order error:",
      error
    );

    return res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================================================
   STRIPE CREATE CHECKOUT
========================================================= */

app.post(
  "/api/payments/stripe/create",
  async (req, res) => {
    try {
      const customer =
        validateCustomer(req.body.customer);

      const items =
        normaliseItems(req.body.items);

      const totalTZS =
        calculateTotal(items);

      const reference =
        createOrderReference();

      const order = {
        reference,

        status: "payment_pending",

        paymentStatus: "unpaid",

        paymentProvider: "stripe",

        paymentId: null,

        currency: "USD",

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

      const session =
        await createStripeCheckout(
          order
        );

      updateOrder(reference, {
        paymentId: session.id,
        paymentStatus: "checkout_created"
      });

      return res.json({
        ok: true,
        provider: "stripe",
        orderReference: reference,
        url: session.url
      });
    } catch (error) {
      console.error(
        "Stripe create error:",
        error
      );

      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   PAYPAL CREATE CHECKOUT
========================================================= */

app.post(
  "/api/payments/paypal/create",
  async (req, res) => {
    try {
      const customer =
        validateCustomer(req.body.customer);

      const items =
        normaliseItems(req.body.items);

      const totalTZS =
        calculateTotal(items);

      const reference =
        createOrderReference();

      const order = {
        reference,

        status: "payment_pending",

        paymentStatus: "unpaid",

        paymentProvider: "paypal",

        paymentId: null,

        currency: "USD",

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

      const paypalOrder =
        await createPayPalOrder(
          order
        );

      const approveUrl =
        getPayPalApproveUrl(
          paypalOrder
        );

      if (!approveUrl) {
        throw new Error(
          "PayPal did not return an approval URL."
        );
      }

      updateOrder(reference, {
        paymentId: paypalOrder.id,
        paymentStatus: "checkout_created"
      });

      return res.json({
        ok: true,
        provider: "paypal",
        orderReference: reference,
        paypalOrderId:
          paypalOrder.id,
        approveUrl
      });
    } catch (error) {
      console.error(
        "PayPal create error:",
        error
      );

      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   PAYPAL RETURN / CAPTURE
========================================================= */

app.get(
  "/api/payments/paypal/return",
  async (req, res) => {
    const paypalOrderId =
      cleanText(
        req.query.token,
        200
      );

    const reference =
      cleanText(
        req.query.order,
        100
      );

    if (!paypalOrderId) {
      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=error`
      );
    }

    try {
      const result =
        await capturePayPalOrder(
          paypalOrderId
        );

      const completed =
        result.status === "COMPLETED";

      if (reference) {
        updateOrder(reference, {
          paymentStatus:
            completed
              ? "paid"
              : "payment_review",

          paymentProvider: "paypal",

          paymentId: paypalOrderId,

          paypalStatus:
            result.status
        });
      }

      if (completed) {
        return res.redirect(
          `${PUBLIC_BASE_URL}/?payment=success&provider=paypal&order=${encodeURIComponent(
            reference
          )}`
        );
      }

      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=review&order=${encodeURIComponent(
          reference
        )}`
      );
    } catch (error) {
      console.error(
        "PayPal return error:",
        error
      );

      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=error&order=${encodeURIComponent(
          reference
        )}`
      );
    }
  }
);

/* =========================================================
   ORDER LOOKUP
========================================================= */

app.get(
  "/api/orders/:reference",
  (req, res) => {
    const reference =
      cleanText(
        req.params.reference,
        100
      );

    const order =
      findOrder(reference);

    if (!order) {
      return res.status(404).json({
        ok: false,
        error: "Order not found."
      });
    }

    return res.json({
      ok: true,
      order
    });
  }
);

/* =========================================================
   WHATSAPP VERIFICATION
========================================================= */

app.get("/webhook", (req, res) => {
  const mode =
    req.query["hub.mode"];

  const token =
    req.query["hub.verify_token"];

  const challenge =
    req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === WHATSAPP_VERIFY_TOKEN
  ) {
    return res
      .status(200)
      .send(challenge);
  }

  return res.sendStatus(403);
});

/* =========================================================
   WHATSAPP WEBHOOK
========================================================= */

app.post("/webhook", (req, res) => {
  console.log(
    "WhatsApp webhook:",
    JSON.stringify(
      req.body,
      null,
      2
    )
  );

  return res.sendStatus(200);
});

/* =========================================================
   WHATSAPP ORDER MESSAGE
========================================================= */

async function sendWhatsAppText(
  phone,
  message
) {
  if (
    !WHATSAPP_ACCESS_TOKEN ||
    !WHATSAPP_PHONE_NUMBER_ID
  ) {
    return {
      configured: false
    };
  }

  const response =
    await fetch(
      `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${WHATSAPP_ACCESS_TOKEN}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          messaging_product:
            "whatsapp",

          to: phone,

          type: "text",

          text: {
            preview_url: false,
            body: message
          }
        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "WhatsApp send error:",
      data
    );

    throw new Error(
      "WhatsApp message could not be sent."
    );
  }

  return {
    configured: true,
    data
  };
}

app.post(
  "/api/orders/:reference/whatsapp",
  async (req, res) => {
    try {
      const reference =
        cleanText(
          req.params.reference,
          100
        );

      const order =
        findOrder(reference);

      if (!order) {
        return res.status(404).json({
          ok: false,
          error: "Order not found."
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
        `${order.customer.state ? order.customer.state + ", " : ""}` +
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
        whatsapp: result
      });
    } catch (error) {
      console.error(
        "WhatsApp order error:",
        error
      );

      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   SERVE WEBSITE
========================================================= */

app.use(
  express.static(
    path.join(__dirname)
  )
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

/* =========================================================
   404 API HANDLER
   IMPORTANT:
   API errors return JSON, not HTML.
========================================================= */

app.use(
  "/api",
  (req, res) => {
    return res.status(404).json({
      ok: false,
      error:
        "API endpoint not found."
    });
  }
);

/* =========================================================
   GENERAL ERROR HANDLER
========================================================= */

app.use(
  (error, req, res, next) => {
    console.error(
      "Server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    return res.status(500).json({
      ok: false,
      error:
        "Internal server error."
    });
  }
);

/* =========================================================
   START
========================================================= */

ensureOrdersFile();

app.listen(
  PORT,
  () => {
    console.log(
      "=========================================="
    );

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
      `Stripe configured: ${Boolean(
        STRIPE_SECRET_KEY
      )}`
    );

    console.log(
      `PayPal configured: ${Boolean(
        PAYPAL_CLIENT_ID &&
        PAYPAL_CLIENT_SECRET
      )}`
    );

    console.log(
      "=========================================="
    );
  }
);
