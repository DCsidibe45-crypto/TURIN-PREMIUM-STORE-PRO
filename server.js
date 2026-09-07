const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL ||
  "https://turin-premium-store-pro-api.onrender.com";

const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY || "";
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET || "";
const PESAPAL_BASE_URL =
  process.env.PESAPAL_BASE_URL || "https://pay.pesapal.com/v3";
const PESAPAL_IPN_ID = process.env.PESAPAL_IPN_ID || "";

const TZS_PER_USD = Number(process.env.TZS_PER_USD || 2550);

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
  { id: 0, name: "Apple iPhone 14 128GB", priceTZS: 1540000 },
  { id: 1, name: "Apple iPhone 14 Pro", priceTZS: 2000000 },
  { id: 2, name: "Apple iPhone 14 Pro Max", priceTZS: 2150000 },
  { id: 3, name: "Apple iPhone 15 Pro", priceTZS: 3200000 },
  { id: 4, name: "Apple iPhone 15 Pro Max", priceTZS: 3500000 },
  { id: 5, name: "Apple iPhone 11 Pro Max", priceTZS: 2800000 },
  { id: 6, name: "Samsung Galaxy S20 Plus", priceTZS: 600000 },
  { id: 7, name: "Samsung Galaxy S20 Ultra", priceTZS: 750000 },
  { id: 8, name: "Samsung Galaxy S21 Ultra", priceTZS: 880000 },
  { id: 9, name: "Samsung Galaxy S22 Ultra", priceTZS: 1330000 },
  { id: 10, name: "Samsung Galaxy S23 Ultra", priceTZS: 1980000 },
  { id: 11, name: "Samsung Galaxy S24 Ultra", priceTZS: 2580000 },
  { id: 12, name: "Google Pixel 7", priceTZS: 600000 },
  { id: 13, name: "Google Pixel 7a", priceTZS: 590000 },
  { id: 14, name: "Google Pixel 7 Pro", priceTZS: 770000 },
  { id: 15, name: "Google Pixel 8 Pro", priceTZS: 1200000 },
  { id: 16, name: "Oraimo FreePods Pro", priceTZS: 165000 },
  { id: 17, name: "Oraimo Shark 4", priceTZS: 55000 },
  { id: 18, name: "JBL Boombox 3", priceTZS: 1300000 },
  { id: 19, name: "JBL Charge 5", priceTZS: 400000 },
  { id: 20, name: "JBL Clip 5", priceTZS: 190000 },
  { id: 21, name: "JBL Flip 6", priceTZS: 290000 },
  { id: 22, name: "JBL Go 4", priceTZS: 160000 },
  { id: 23, name: "JBL Tune 510BT", priceTZS: 30000 },
  { id: 24, name: "Oraimo Smart Clipper 2 Gold", priceTZS: 95000 },
  { id: 25, name: "Oraimo Smart Blender", priceTZS: 130000 },
  { id: 26, name: "Apple iPad Pro 12.9-inch 128GB", priceTZS: 2150000 },
  { id: 27, name: "4G Wireless Router", priceTZS: 150000 },
  { id: 28, name: "Airtel 5G SmartBox Router", priceTZS: 110000 },
  { id: 29, name: "Aborder 1.8L 4-in-1 Juice Extractor", priceTZS: 115000 },
  { id: 30, name: "Aborder 2L Electric Kettle", priceTZS: 32000 },
  { id: 31, name: "Lenovo ThinkPad E14 Gen 2", priceTZS: 2490000 },
  { id: 32, name: "Lenovo ThinkPad E14 Gen 5", priceTZS: 2250000 },
  { id: 33, name: "Microsoft Surface Laptop 3", priceTZS: 1250000 },
  { id: 34, name: "iPhone 16", priceTZS: 2600000 },
  { id: 35, name: "iPhone 17", priceTZS: 3500000 },
  { id: 36, name: "iPhone 17 Pro Max", priceTZS: 5350000 },
  { id: 37, name: "Samsung Galaxy A17", priceTZS: 520000 },
  { id: 38, name: "Samsung Galaxy A07s", priceTZS: 380000 },
  { id: 39, name: "Tecno Camon 20 Pro 8+256GB", priceTZS: 585000 }
];

/* =========================================================
   HELPERS
========================================================= */

function ensureOrdersFile() {
  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), "utf8");
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
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

function createOrderReference() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `TURIN-${date}-${random}`;
}

function cleanText(value, max = 500) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, max);
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

    if (!Number.isInteger(productId) || productId < 0 || productId >= products.length) {
      throw new Error("Invalid product.");
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
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
  return items.reduce((total, item) => total + item.totalTZS, 0);
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

  if (!firstName) throw new Error("First name is required.");
  if (!lastName) throw new Error("Last name is required.");
  if (!isValidEmail(email)) throw new Error("A valid email address is required.");
  if (!phone) throw new Error("Phone / WhatsApp number is required.");
  if (!country) throw new Error("Country is required.");
  if (!city) throw new Error("City is required.");
  if (!address) throw new Error("Street address is required.");

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
  return readOrders().find((order) => order.reference === reference);
}

function updateOrder(reference, updates) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.reference === reference);

  if (index === -1) return null;

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

function countryToIso2(country) {
  const value = cleanText(country, 100).trim();
  const upper = value.toUpperCase();

  if (/^[A-Z]{2}$/.test(upper)) return upper;

  const countryMap = {
    "tanzania": "TZ",
    "united republic of tanzania": "TZ",
    "kenya": "KE",
    "uganda": "UG",
    "rwanda": "RW",
    "zambia": "ZM",
    "malawi": "MW",
    "south africa": "ZA",
    "nigeria": "NG",
    "ghana": "GH",
    "united states": "US",
    "usa": "US",
    "united kingdom": "GB",
    "uk": "GB",
    "canada": "CA",
    "australia": "AU",
    "germany": "DE",
    "france": "FR",
    "united arab emirates": "AE",
    "uae": "AE",
    "china": "CN",
    "india": "IN",
    "japan": "JP",
    "italy": "IT",
    "spain": "ES",
    "netherlands": "NL",
    "switzerland": "CH",
    "sweden": "SE",
    "norway": "NO",
    "denmark": "DK",
    "finland": "FI",
    "ireland": "IE",
    "mozambique": "MZ",
    "botswana": "BW",
    "namibia": "NA",
    "zimbabwe": "ZW"
  };

  return countryMap[value.toLowerCase()] || "TZ";
}

/* =========================================================
   PESAPAL HELPERS
   API 3.0: Live = https://pay.pesapal.com/v3
========================================================= */

async function getPesapalAccessToken() {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw new Error(
      "Pesapal is not configured. Add PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in Render Environment Variables."
    );
  }

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Auth/RequestToken`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        consumer_key: PESAPAL_CONSUMER_KEY,
        consumer_secret: PESAPAL_CONSUMER_SECRET
      })
    }
  );

  const data = await response.json();

  if (!response.ok || !data.token) {
    console.error("Pesapal authentication error:", data);
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Unable to authenticate with Pesapal."
    );
  }

  return data.token;
}

async function createPesapalOrder(order) {
  if (!PESAPAL_IPN_ID) {
    throw new Error(
      "Pesapal IPN is not configured. Add PESAPAL_IPN_ID in Render Environment Variables."
    );
  }

  const accessToken = await getPesapalAccessToken();

  const payload = {
    id: order.reference,
    currency: "TZS",
    amount: Number(order.totalTZS.toFixed(2)),
    description: `TURIN PREMIUM STORE Order ${order.reference}`.slice(0, 100),
    callback_url:
      `${PUBLIC_BASE_URL}/api/payments/pesapal/callback`,
    cancellation_url:
      `${PUBLIC_BASE_URL}/?payment=cancelled&provider=pesapal&order=` +
      encodeURIComponent(order.reference),
    notification_id: PESAPAL_IPN_ID,
    billing_address: {
      email_address: order.customer.email,
      phone_number: order.customer.phone,
      country_code: countryToIso2(order.customer.country),
      first_name: order.customer.firstName,
      middle_name: "",
      last_name: order.customer.lastName,
      line_1: order.customer.address,
      line_2: "",
      city: order.customer.city,
      state: order.customer.state || "",
      postal_code: order.customer.postal || "",
      zip_code: order.customer.postal || ""
    }
  };

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok || !data.redirect_url || !data.order_tracking_id) {
    console.error("Pesapal submit order error:", data);
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Pesapal could not create the payment order."
    );
  }

  return data;
}

async function getPesapalTransactionStatus(orderTrackingId) {
  const accessToken = await getPesapalAccessToken();

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Pesapal transaction status error:", data);
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Unable to retrieve Pesapal transaction status."
    );
  }

  return data;
}

function updateOrderFromPesapalStatus(reference, trackingId, statusData) {
  if (!reference) return null;

  const statusCode = Number(statusData?.status_code);
  const description = cleanText(
    statusData?.payment_status_description || statusData?.payment_status,
    100
  ).toLowerCase();

  let paymentStatus = "payment_pending";

  if (statusCode === 1 || description === "completed") {
    paymentStatus = "paid";
  } else if (statusCode === 2 || description === "failed") {
    paymentStatus = "failed";
  } else if (statusCode === 3 || description === "reversed") {
    paymentStatus = "reversed";
  }

  return updateOrder(reference, {
    paymentStatus,
    paymentProvider: "pesapal",
    paymentId: trackingId,
    pesapalStatusCode: statusCode,
    pesapalStatusDescription:
      statusData?.payment_status_description || null,
    pesapalPaymentMethod:
      statusData?.payment_method || null,
    pesapalConfirmationCode:
      statusData?.confirmation_code || null,
    pesapalAmount:
      statusData?.amount ?? null,
    pesapalCurrency:
      statusData?.currency || null
  });
}

async function registerPesapalIpn() {
  const accessToken = await getPesapalAccessToken();

  const response = await fetch(
    `${PESAPAL_BASE_URL}/api/URLSetup/RegisterIPN`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        url: `${PUBLIC_BASE_URL}/api/payments/pesapal/ipn`,
        ipn_notification_type: "GET"
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Pesapal IPN registration error:", data);
    throw new Error(
      data?.error?.message ||
        data?.message ||
        "Pesapal IPN registration failed."
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
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("PayPal token error:", data);
    throw new Error("Unable to authenticate with PayPal.");
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
            description: "TURIN PREMIUM STORE International Order",
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
  if (!data || !Array.isArray(data.links)) return null;
  const approve = data.links.find((link) => link.rel === "approve");
  return approve ? approve.href : null;
}

async function capturePayPalOrder(paypalOrderId) {
  const accessToken = await getPayPalAccessToken();

  const response = await fetch(
    `${PAYPAL_BASE_URL}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
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
   NORMAL JSON
========================================================= */

app.use(express.json({ limit: "1mb" }));

/* =========================================================
   CORS
========================================================= */

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

/* =========================================================
   SECURITY HEADERS
========================================================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
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
    pesapalConfigured: Boolean(
      PESAPAL_CONSUMER_KEY &&
      PESAPAL_CONSUMER_SECRET &&
      PESAPAL_IPN_ID
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
    const customer = validateCustomer(req.body.customer);
    const items = normaliseItems(req.body.items);
    const totalTZS = calculateTotal(items);
    const reference = createOrderReference();

    const order = {
      reference,
      status: "pending_confirmation",
      paymentStatus: "unpaid",
      paymentProvider: null,
      paymentId: null,
      currency: cleanText(req.body.currency, 10) || "TZS",
      customer,
      items,
      totalTZS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    console.error("Create order error:", error);

    return res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

/* =========================================================
   PESAPAL CREATE CHECKOUT
========================================================= */

app.post(
  "/api/payments/pesapal/create",
  async (req, res) => {
    try {
      const customer = validateCustomer(req.body.customer);
      const items = normaliseItems(req.body.items);
      const totalTZS = calculateTotal(items);
      const reference = createOrderReference();

      const order = {
        reference,
        status: "payment_pending",
        paymentStatus: "unpaid",
        paymentProvider: "pesapal",
        paymentId: null,
        currency: "TZS",
        customer,
        items,
        totalTZS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "website"
      };

      saveOrder(order);

      const pesapalOrder = await createPesapalOrder(order);

      updateOrder(reference, {
        paymentId: pesapalOrder.order_tracking_id,
        paymentStatus: "checkout_created",
        pesapalMerchantReference: pesapalOrder.merchant_reference || reference
      });

      return res.json({
        ok: true,
        provider: "pesapal",
        orderReference: reference,
        pesapalOrderId: pesapalOrder.order_tracking_id,
        url: pesapalOrder.redirect_url
      });
    } catch (error) {
      console.error("Pesapal create error:", error);

      return res.status(400).json({
        ok: false,
        error: error.message
      });
    }
  }
);

/* =========================================================
   PESAPAL CALLBACK
========================================================= */

app.get(
  "/api/payments/pesapal/callback",
  async (req, res) => {
    const trackingId = cleanText(req.query.OrderTrackingId, 200);
    const reference = cleanText(req.query.OrderMerchantReference, 100);

    if (!trackingId) {
      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=error&provider=pesapal`
      );
    }

    try {
      const statusData = await getPesapalTransactionStatus(trackingId);
      const order = updateOrderFromPesapalStatus(
        reference,
        trackingId,
        statusData
      );

      const statusCode = Number(statusData?.status_code);

      if (statusCode === 1) {
        return res.redirect(
          `${PUBLIC_BASE_URL}/payment-success.html?provider=pesapal&order=${encodeURIComponent(
            reference
          )}`
        );
      }

      if (statusCode === 2 || statusCode === 3) {
        return res.redirect(
          `${PUBLIC_BASE_URL}/?payment=failed&provider=pesapal&order=${encodeURIComponent(
            reference
          )}`
        );
      }

      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=pending&provider=pesapal&order=${encodeURIComponent(
          reference
        )}`
      );
    } catch (error) {
      console.error("Pesapal callback error:", error);

      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=error&provider=pesapal&order=${encodeURIComponent(
          reference
        )}`
      );
    }
  }
);

/* =========================================================
   PESAPAL IPN
   Registered as GET. Pesapal sends tracking/reference and
   the server queries GetTransactionStatus for the real status.
========================================================= */

async function handlePesapalIpn(req, res) {
  const trackingId = cleanText(
    req.query.OrderTrackingId || req.body?.OrderTrackingId,
    200
  );

  const reference = cleanText(
    req.query.OrderMerchantReference || req.body?.OrderMerchantReference,
    100
  );

  const notificationType = cleanText(
    req.query.OrderNotificationType || req.body?.OrderNotificationType,
    50
  );

  if (!trackingId) {
    return res.status(400).json({
      orderNotificationType: notificationType || "IPNCHANGE",
      orderTrackingId: "",
      orderMerchantReference: reference,
      status: 500
    });
  }

  try {
    const statusData = await getPesapalTransactionStatus(trackingId);

    updateOrderFromPesapalStatus(
      reference,
      trackingId,
      statusData
    );

    return res.json({
      orderNotificationType: notificationType || "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference,
      status: 200
    });
  } catch (error) {
    console.error("Pesapal IPN error:", error);

    return res.status(500).json({
      orderNotificationType: notificationType || "IPNCHANGE",
      orderTrackingId: trackingId,
      orderMerchantReference: reference,
      status: 500
    });
  }
}

app.get(
  "/api/payments/pesapal/ipn",
  handlePesapalIpn
);

app.post(
  "/api/payments/pesapal/ipn",
  handlePesapalIpn
);

/* =========================================================
   PESAPAL REGISTER IPN - ONE-TIME SETUP HELPER
   After calling this endpoint, copy the returned ipn_id into
   Render as PESAPAL_IPN_ID.
========================================================= */

app.post(
  "/api/payments/pesapal/register-ipn",
  async (req, res) => {
    try {
      const data = await registerPesapalIpn();

      return res.json({
        ok: true,
        ...data,
        message:
          "Copy the returned ipn_id into Render as PESAPAL_IPN_ID."
      });
    } catch (error) {
      console.error("Pesapal register IPN error:", error);

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
      const customer = validateCustomer(req.body.customer);
      const items = normaliseItems(req.body.items);
      const totalTZS = calculateTotal(items);
      const reference = createOrderReference();

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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: "website"
      };

      saveOrder(order);

      const paypalOrder = await createPayPalOrder(order);
      const approveUrl = getPayPalApproveUrl(paypalOrder);

      if (!approveUrl) {
        throw new Error("PayPal did not return an approval URL.");
      }

      updateOrder(reference, {
        paymentId: paypalOrder.id,
        paymentStatus: "checkout_created"
      });

      return res.json({
        ok: true,
        provider: "paypal",
        orderReference: reference,
        paypalOrderId: paypalOrder.id,
        approveUrl
      });
    } catch (error) {
      console.error("PayPal create error:", error);

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
    const paypalOrderId = cleanText(req.query.token, 200);
    const reference = cleanText(req.query.order, 100);
    if (!paypalOrderId) {
      return res.redirect(
        `${PUBLIC_BASE_URL}/?payment=error`
      );
    }

    try {
      const result = await capturePayPalOrder(paypalOrderId);
      const completed = result.status === "COMPLETED";

      if (reference) {
        updateOrder(reference, {
          paymentStatus: completed ? "paid" : "payment_review",
          paymentProvider: "paypal",
          paymentId: paypalOrderId,
          paypalStatus: result.status
        });
      }

      if (completed) {
        return res.redirect(
          `${PUBLIC_BASE_URL}/payment-success.html?provider=paypal&order=${encodeURIComponent(
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
      console.error("PayPal return error:", error);

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
    const reference = cleanText(req.params.reference, 100);
    const order = findOrder(reference);

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
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === WHATSAPP_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

/* =========================================================
   WHATSAPP WEBHOOK
========================================================= */

app.post("/webhook", (req, res) => {
  console.log(
    "WhatsApp webhook:",
    JSON.stringify(req.body, null, 2)
  );

  return res.sendStatus(200);
});

/* =========================================================
   WHATSAPP ORDER MESSAGE
========================================================= */

async function sendWhatsAppText(phone, message) {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    return { configured: false };
  }

  const response = await fetch(
    `https://graph.facebook.com/v23.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: {
          preview_url: false,
          body: message
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("WhatsApp send error:", data);
    throw new Error("WhatsApp message could not be sent.");
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
      const reference = cleanText(req.params.reference, 100);
      const order = findOrder(reference);

      if (!order) {
        return res.status(404).json({
          ok: false,
          error: "Order not found."
        });
      }

      const itemLines = order.items
        .map((item) => `${item.name} x${item.quantity}`)
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
        `Merchandise Total: TZS ${order.totalTZS.toLocaleString("en-US")}\n\n` +
        `Please confirm stock, shipping, final amount and payment instructions.`;

      const result = await sendWhatsAppText(
        WHATSAPP_BUSINESS_NUMBER,
        message
      );

      return res.json({
        ok: true,
        whatsapp: result
      });
    } catch (error) {
      console.error("WhatsApp order error:", error);

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

app.use(express.static(path.join(__dirname)));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

/* =========================================================
   404 API HANDLER
   IMPORTANT:
   API errors return JSON, not HTML.
========================================================= */

app.use("/api", (req, res) => {
  return res.status(404).json({
    ok: false,
    error: "API endpoint not found."
  });
});

/* =========================================================
   GENERAL ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
  console.error("Server error:", error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    ok: false,
    error: "Internal server error."
  });
});

/* =========================================================
   START
========================================================= */

ensureOrdersFile();

app.listen(PORT, () => {
  console.log("==========================================");
  console.log("TURIN PREMIUM STORE");
  console.log(`Server running on port ${PORT}`);
  console.log(`Public URL: ${PUBLIC_BASE_URL}`);
  console.log(
    `Pesapal configured: ${Boolean(
      PESAPAL_CONSUMER_KEY &&
      PESAPAL_CONSUMER_SECRET &&
      PESAPAL_IPN_ID
    )}`
  );
  console.log(
    `PayPal configured: ${Boolean(
      PAYPAL_CLIENT_ID &&
      PAYPAL_CLIENT_SECRET
    )}`
  );
  console.log("==========================================");
});
