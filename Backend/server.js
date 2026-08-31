//Data coming from frontend (React) req = request so we are getting email and password from the request body. We are using destructuring assignment to extract email and password from req.body. This assumes that the incoming request has a JSON body with properties email and password. For example, if the frontend sends a POST request with a JSON body like { "email": "john@example.com", "password": "password123" }
// req = request data from the frontend
// when you send data from the frontend the data travels to the backend as req.body
// when we do this: user  => user.email == email  it is a shorter way pf writing a function long way would be like this: function(user) { return user.email == email }
// why cors because frontend and backend run on different ports so cors is a middleware that allows us to enable cross-origin resource sharing. It allows the frontend to make requests to the backend even though they are running on different ports. Without cors, the browser would block the requests from the frontend to the backend due to security reasons. By using cors, we can allow the frontend to access the backend resources without any issues.
// everytime you bring something into server.js always use require("") and specify what you want to bring in.

require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const sql = require("./db");
const multer = require("multer");
const cloudinary = require("./cloudinary");
const { transporter } = require("./emailService");
const paystack = require("./paystack");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

const BACKEND_URL =
  process.env.BACKEND_URL || "http://localhost:3000";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }
    cb(null, true);
  }
});

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Must be registered BEFORE express.json() so the webhook
// route gets the raw request body (needed for signature verification)
app.use("/paystack/webhook", express.raw({ type: "application/json", limit: "1mb" }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400
}));

// Lightweight security headers. Keep these at the API layer; the frontend host
// should also set a strict Content-Security-Policy for the React application.
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== "production" ? "dev-only-change-this-secret-before-production" : "");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production");
}

const ACCESS_TOKEN_TTL = process.env.JWT_EXPIRES_IN || "2h";


/* ============================================================
   WEBSITE MAINTENANCE MODE
   ------------------------------------------------------------
   Stored in SQL Server so the setting survives deployments and
   can be changed securely from the Admin Dashboard.
   A short cache avoids a database query on every request and also
   works well when traffic is high. Other API instances refresh the
   value within a few seconds.
============================================================ */

const MAINTENANCE_CACHE_MS = Number(process.env.MAINTENANCE_CACHE_MS || 5000);
let maintenanceCache = {
  enabled: false,
  message: "We are currently carrying out scheduled maintenance. Please check back shortly.",
  checkedAt: 0
};
let maintenanceRefreshPromise = null;

async function ensureWebsiteSettingsTable() {
  await sql.query`
    IF OBJECT_ID('dbo.WebsiteSettings', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.WebsiteSettings (
        Id INT NOT NULL PRIMARY KEY,
        MaintenanceMode BIT NOT NULL CONSTRAINT DF_WebsiteSettings_Maintenance DEFAULT 0,
        MaintenanceMessage NVARCHAR(500) NULL,
        UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_WebsiteSettings_UpdatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedByUserId INT NULL
      );
    END;

    IF NOT EXISTS (SELECT 1 FROM dbo.WebsiteSettings WHERE Id = 1)
    BEGIN
      INSERT INTO dbo.WebsiteSettings (Id, MaintenanceMode, MaintenanceMessage)
      VALUES (
        1,
        0,
        'We are currently carrying out scheduled maintenance. Please check back shortly.'
      );
    END;
  `;
}

async function refreshMaintenanceCache(force = false) {
  const now = Date.now();
  if (!force && now - maintenanceCache.checkedAt < MAINTENANCE_CACHE_MS) {
    return maintenanceCache;
  }

  if (maintenanceRefreshPromise) return maintenanceRefreshPromise;

  maintenanceRefreshPromise = (async () => {
    try {
      await ensureWebsiteSettingsTable();
      const result = await sql.query`
        SELECT MaintenanceMode, MaintenanceMessage, UpdatedAt, UpdatedByUserId
        FROM dbo.WebsiteSettings
        WHERE Id = 1
      `;

      const row = result.recordset[0];
      if (row) {
        maintenanceCache = {
          enabled: row.MaintenanceMode === true || row.MaintenanceMode === 1,
          message: row.MaintenanceMessage || "We are currently carrying out scheduled maintenance. Please check back shortly.",
          updatedAt: row.UpdatedAt || null,
          updatedByUserId: row.UpdatedByUserId || null,
          checkedAt: Date.now()
        };
      }
    } catch (error) {
      // Fail open if the settings table/database is temporarily unavailable.
      // This avoids accidentally taking the whole website offline because the
      // maintenance-status lookup itself failed.
      console.error("Maintenance status error:", error.message);
      maintenanceCache.checkedAt = Date.now();
    } finally {
      maintenanceRefreshPromise = null;
    }

    return maintenanceCache;
  })();

  return maintenanceRefreshPromise;
}

function requestHasValidAdminToken(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  try {
    const payload = jwt.verify(match[1], JWT_SECRET, {
      issuer: "all-liquors-api",
      audience: "all-liquors-web"
    });
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

function isMaintenanceEssentialPath(req) {
  const p = req.path;

  if (p === "/site-status") return true;
  if (p === "/paystack/webhook") return true;
  if (p === "/login") return true;
  if (p === "/forgot-password") return true;
  if (p === "/verify-reset-otp") return true;
  if (p === "/reset-password") return true;

  // Let already-started payments finish verification cleanly.
  if (p.startsWith("/orders/verify/")) return true;
  if (p.startsWith("/resort/bookings/verify/")) return true;
  if (p.startsWith("/tickets/verify-payment/")) return true;

  return false;
}

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user.Id),
      email: user.Email,
      isAdmin: user.IsAdmin === true || user.IsAdmin === 1
    },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL, issuer: "all-liquors-api", audience: "all-liquors-web" }
  );
}

function authenticateToken(req, res, next) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ message: "Authentication required" });

  try {
    const payload = jwt.verify(match[1], JWT_SECRET, {
      issuer: "all-liquors-api",
      audience: "all-liquors-web"
    });
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      isAdmin: payload.isAdmin === true
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Session expired. Please sign in again." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: "Admin access required" });
  next();
}

function validateOwnedUserId(req, res, next) {
  if (req.user?.isAdmin) return next();

  const pathMatch = req.path.match(/^\/(?:orders\/user|resort\/bookings\/user|tickets\/user|favorites)\/(\d+)/);
  const requestedUserId = Number(pathMatch?.[1] || req.body?.userId || 0);
  if (requestedUserId && requestedUserId !== req.user?.id) {
    return res.status(403).json({ message: "You cannot access another customer's data" });
  }
  next();
}

function isAdminRoute(req) {
  const p = req.path;
  if (p.startsWith("/admin/")) return true;
  if (p.startsWith("/users")) return true;
  if (p.startsWith("/employees")) return true;
  if (p.startsWith("/attendance")) return true;
  if (p.startsWith("/messages")) return true;
  if (p.startsWith("/leave")) return true;
  if (p === "/clockin" || p === "/clockout") return true;
  if (p.startsWith("/send-email") || p.startsWith("/send-event-email") || p.startsWith("/send-event-reminder")) return true;
  if (req.method !== "GET" && (p === "/events" || /^\/events\/\d+$/.test(p))) return true;
  if (req.method !== "GET" && (p === "/products" || /^\/products\/\d+$/.test(p))) return true;
  if (req.method === "GET" && p === "/orders") return true;
  if (req.method === "PUT" && /^\/orders\/\d+\/collection-status$/.test(p)) return true;
  if (req.method === "GET" && p === "/resort/bookings") return true;
  if (req.method === "PUT" && /^\/resort\/bookings\/\d+\/status$/.test(p)) return true;
  if (req.method === "POST" && /^\/tickets\/token\/[^/]+\/check-in$/.test(p)) return true;
  return false;
}

function isAuthenticatedCustomerRoute(req) {
  const p = req.path;
  return (
    p === "/orders/initialize" ||
    p.startsWith("/orders/verify/") ||
    p.startsWith("/orders/user/") ||
    p === "/resort/bookings/initialize" ||
    p.startsWith("/resort/bookings/verify/") ||
    p.startsWith("/resort/bookings/user/") ||
    p === "/tickets/initialize" ||
    p.startsWith("/tickets/verify-payment/") ||
    p.startsWith("/tickets/user/") ||
    p.startsWith("/favorites")
  );
}


// Public endpoint used by the React app to decide whether to display the
// maintenance screen. It intentionally exposes no sensitive information.
app.get("/site-status", async (req, res) => {
  const status = await refreshMaintenanceCache();
  res.setHeader("Cache-Control", "no-store");
  res.json({
    maintenanceMode: status.enabled,
    message: status.message
  });
});

// Secure admin-only settings endpoints. isAdminRoute() protects /admin/*
// through the JWT authorization guard below.
app.get("/admin/site-settings", authenticateToken, requireAdmin, async (req, res) => {
  const status = await refreshMaintenanceCache(true);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    maintenanceMode: status.enabled,
    maintenanceMessage: status.message,
    updatedAt: status.updatedAt || null,
    updatedByUserId: status.updatedByUserId || null
  });
});

app.put("/admin/site-settings/maintenance", authenticateToken, requireAdmin, async (req, res) => {
  const enabled = req.body?.enabled;
  const message = String(req.body?.message || "").trim();

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be true or false" });
  }

  if (message.length > 500) {
    return res.status(400).json({ message: "Maintenance message must be 500 characters or less" });
  }

  const safeMessage = message || "We are currently carrying out scheduled maintenance. Please check back shortly.";

  await ensureWebsiteSettingsTable();
  await new sql.Request()
    .input("enabled", sql.Bit, enabled)
    .input("message", sql.NVarChar(500), safeMessage)
    .input("updatedBy", sql.Int, req.user.id)
    .query(`
      UPDATE dbo.WebsiteSettings
      SET MaintenanceMode = @enabled,
          MaintenanceMessage = @message,
          UpdatedAt = SYSUTCDATETIME(),
          UpdatedByUserId = @updatedBy
      WHERE Id = 1
    `);

  maintenanceCache = {
    enabled,
    message: safeMessage,
    updatedAt: new Date(),
    updatedByUserId: req.user.id,
    checkedAt: Date.now()
  };

  console.log(`Maintenance mode ${enabled ? "ENABLED" : "DISABLED"} by admin user ${req.user.id}`);

  res.json({
    success: true,
    maintenanceMode: enabled,
    maintenanceMessage: safeMessage,
    message: enabled
      ? "Maintenance mode is now ON. Customers will see the maintenance page."
      : "Maintenance mode is now OFF. The website is available to customers."
  });
});

// Backend enforcement. The React maintenance page is only the presentation
// layer; this middleware prevents customers from bypassing it and directly
// using the API while maintenance is active. Admin JWTs and critical payment
// callbacks remain available.
app.use(async (req, res, next) => {
  if (isMaintenanceEssentialPath(req)) return next();

  const status = await refreshMaintenanceCache();
  if (!status.enabled) return next();

  if (requestHasValidAdminToken(req)) return next();

  res.setHeader("Retry-After", "300");
  return res.status(503).json({
    maintenance: true,
    message: status.message
  });
});

// Central API authorization guard. The frontend route guards are UX only;
// this server-side guard is the actual security boundary.
app.use((req, res, next) => {
  if (req.path === "/paystack/webhook") return next();

  if (isAdminRoute(req)) {
    return authenticateToken(req, res, () => requireAdmin(req, res, next));
  }

  if (isAuthenticatedCustomerRoute(req)) {
    return authenticateToken(req, res, () => validateOwnedUserId(req, res, next));
  }

  return next();
});

// Generic rate limiter with bounded in-memory state. In production, also enable
// CDN/WAF or Redis-backed distributed rate limiting when running many API instances.
const rateBuckets = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateBuckets) {
    if (value.resetAt <= now) rateBuckets.delete(key);
  }
}, 60_000).unref();

function createRateLimiter({ windowMs, max, keyFn, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = keyFn(req);
    let bucket = rateBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({ message, retryAfter });
    }
    next();
  };
}

const loginFailures = new Map();
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MS = 15 * 60 * 1000;

function loginFailureKey(req, email) {
  return `${req.ip}:${email}`;
}

function getLoginLock(req, email) {
  const key = loginFailureKey(req, email);
  const state = loginFailures.get(key);
  if (!state) return null;
  if (state.lockedUntil && state.lockedUntil > Date.now()) return state;
  if (state.lockedUntil && state.lockedUntil <= Date.now()) loginFailures.delete(key);
  return null;
}

function recordLoginFailure(req, email) {
  const key = loginFailureKey(req, email);
  const now = Date.now();
  const previous = loginFailures.get(key);
  const state = !previous || (previous.firstFailureAt + LOGIN_LOCK_MS <= now)
    ? { count: 0, firstFailureAt: now, lockedUntil: 0 }
    : previous;
  state.count += 1;
  if (state.count >= LOGIN_MAX_FAILURES) state.lockedUntil = now + LOGIN_LOCK_MS;
  loginFailures.set(key, state);
  return state;
}

function clearLoginFailures(req, email) {
  loginFailures.delete(loginFailureKey(req, email));
}

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: (req) => `reset:${req.ip}:${String(req.body?.email || "").trim().toLowerCase()}`,
  message: "Too many password reset attempts. Please wait and try again."
});

const publicWriteLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyFn: (req) => `public:${req.ip}:${req.path}`,
  message: "Too many requests. Please slow down and try again."
});

app.use(["/contact", "/subscribe"], publicWriteLimiter);

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function passwordProblem(password) {
  if (typeof password !== "string") return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter";
  if (!/\d/.test(password)) return "Password must include at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character";
  return null;
}

function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/* ROOT */
app.get("/", (req, res) => {
  res.send("Server running ✅");
});


/* ================= EVENTS ================= */

async function saveEventTicketTypes(eventId, rawTicketTypes, tx) {
  let types;
  try { types = JSON.parse(rawTicketTypes || '[]'); } catch { throw new Error('Ticket categories are invalid'); }
  if (!Array.isArray(types) || types.length === 0) throw new Error('Add at least one ticket category');

  const existingResult = await new sql.Request(tx).input('eventId', sql.Int, Number(eventId)).query(`
    SELECT Id, WebsiteTicketsSold FROM EventTicketTypes WHERE EventId = @eventId
  `);
  const existingMap = new Map(existingResult.recordset.map((row) => [Number(row.Id), row]));
  const keptIds = [];

  for (let index = 0; index < types.length; index++) {
    const type = types[index];
    const name = String(type.name || '').trim();
    const price = Number(type.price);
    const limit = Number(type.websiteTicketLimit);
    const description = String(type.description || '').trim();
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(limit) || limit < 1) {
      throw new Error('Every ticket category needs a name, valid price and website allocation');
    }

    const existingId = Number(type.id || 0);
    if (existingId && existingMap.has(existingId)) {
      const sold = Number(existingMap.get(existingId).WebsiteTicketsSold || 0);
      if (limit < sold) throw new Error(`${name} allocation cannot be lower than tickets already sold (${sold})`);
      await new sql.Request(tx)
        .input('id', sql.Int, existingId).input('eventId', sql.Int, Number(eventId))
        .input('name', sql.NVarChar(120), name).input('price', sql.Decimal(10,2), price)
        .input('description', sql.NVarChar(500), description).input('limit', sql.Int, limit).input('sort', sql.Int, index)
        .query(`UPDATE EventTicketTypes SET Name=@name, Price=@price, Description=@description, WebsiteTicketLimit=@limit, SortOrder=@sort, IsActive=1, UpdatedAt=GETDATE() WHERE Id=@id AND EventId=@eventId`);
      keptIds.push(existingId);
    } else {
      const inserted = await new sql.Request(tx)
        .input('eventId', sql.Int, Number(eventId)).input('name', sql.NVarChar(120), name)
        .input('price', sql.Decimal(10,2), price).input('description', sql.NVarChar(500), description)
        .input('limit', sql.Int, limit).input('sort', sql.Int, index)
        .query(`INSERT INTO EventTicketTypes(EventId,Name,Price,Description,WebsiteTicketLimit,SortOrder) OUTPUT INSERTED.Id VALUES(@eventId,@name,@price,@description,@limit,@sort)`);
      keptIds.push(inserted.recordset[0].Id);
    }
  }

  for (const existing of existingResult.recordset) {
    if (!keptIds.includes(Number(existing.Id))) {
      if (Number(existing.WebsiteTicketsSold || 0) > 0) {
        await new sql.Request(tx).input('id', sql.Int, existing.Id).query(`UPDATE EventTicketTypes SET IsActive=0, UpdatedAt=GETDATE() WHERE Id=@id`);
      } else {
        await new sql.Request(tx).input('id', sql.Int, existing.Id).query(`DELETE FROM EventTicketTypes WHERE Id=@id AND NOT EXISTS(SELECT 1 FROM EventTicketOrderItems WHERE TicketTypeId=@id)`);
      }
    }
  }
}

/* GET EVENTS */
app.get("/events", async (req, res) => {
  try {
    await releaseExpiredEventTicketHolds().catch(() => {});

    const result = await sql.query`
      SELECT 
        e.*,

        (
          SELECT COUNT(*)
          FROM EventTicketTypes tt
          WHERE tt.EventId = e.Id
            AND tt.IsActive = 1
        ) AS TicketTypeCount,

        (
          SELECT MIN(tt.Price)
          FROM EventTicketTypes tt
          WHERE tt.EventId = e.Id
            AND tt.IsActive = 1
        ) AS MinTicketPrice,

        ISNULL(
          (
            SELECT SUM(tt.WebsiteTicketLimit)
            FROM EventTicketTypes tt
            WHERE tt.EventId = e.Id
              AND tt.IsActive = 1
          ),
          0
        ) AS WebsiteTicketLimit,

        ISNULL(
          (
            SELECT SUM(tt.WebsiteTicketsSold)
            FROM EventTicketTypes tt
            WHERE tt.EventId = e.Id
              AND tt.IsActive = 1
          ),
          0
        ) AS WebsiteTicketsSold,

        ISNULL(
          (
            SELECT SUM(tt.WebsiteTicketsHeld)
            FROM EventTicketTypes tt
            WHERE tt.EventId = e.Id
              AND tt.IsActive = 1
          ),
          0
        ) AS WebsiteTicketsHeld,

        ISNULL(
          (
            SELECT SUM(
              CASE
                WHEN (
                  tt.WebsiteTicketLimit
                  - tt.WebsiteTicketsSold
                  - tt.WebsiteTicketsHeld
                ) < 0
                THEN 0

                ELSE (
                  tt.WebsiteTicketLimit
                  - tt.WebsiteTicketsSold
                  - tt.WebsiteTicketsHeld
                )
              END
            )
            FROM EventTicketTypes tt
            WHERE tt.EventId = e.Id
              AND tt.IsActive = 1
          ),
          0
        ) AS WebsiteTicketsAvailable

      FROM Events e

      WHERE ISNULL(e.IsDeleted, 0) = 0

      ORDER BY e.EventDate ASC
    `;

    res.json(result.recordset);

  } catch (err) {
    console.error("GET EVENTS ERROR:", err);

    res.status(500).send(
      "Error fetching events ❌"
    );
  }
});

/* CREATE EVENT */
app.post("/events", upload.single("image"), async (req, res) => {
  const { title, location, eventDate, description, directTicketingEnabled, ticketTypes } = req.body;
  if (!title || !location || !eventDate || !description || !req.file) return res.status(400).send("Event details and image are required");
  let uploadResult;
  try {
    const types = JSON.parse(ticketTypes || '[]');
    if (!types.length) return res.status(400).send('Add at least one ticket category');
    const minPrice = Math.min(...types.map((t) => Number(t.price)).filter(Number.isFinite));
    const file = req.file.buffer.toString("base64");
    uploadResult = await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${file}`, { folder: "events" });
    const tx = new sql.Transaction(); await tx.begin();
    try {
      const inserted = await new sql.Request(tx)
        .input('title', sql.NVarChar, title).input('location', sql.NVarChar, location).input('eventDate', sql.DateTime2, new Date(eventDate))
        .input('price', sql.Decimal(10,2), Number.isFinite(minPrice) ? minPrice : 0).input('description', sql.NVarChar, description)
        .input('image', sql.NVarChar, uploadResult.secure_url).input('publicId', sql.NVarChar, uploadResult.public_id)
        .input('enabled', sql.Bit, String(directTicketingEnabled) !== 'false' ? 1 : 0)
        .query(`INSERT INTO Events(Title,Location,EventDate,Price,Description,Image,PublicId,TicketLink,DirectTicketingEnabled,TotalCapacity,WebsiteTicketLimit) OUTPUT INSERTED.Id VALUES(@title,@location,@eventDate,@price,@description,@image,@publicId,'',@enabled,0,0)`);
      await saveEventTicketTypes(inserted.recordset[0].Id, ticketTypes, tx);
      await tx.commit();
    } catch (err) { await tx.rollback(); throw err; }
    res.send("Event created successfully ✅");
  } catch (err) {
    if (uploadResult?.public_id) await cloudinary.uploader.destroy(uploadResult.public_id).catch(() => {});
    console.error(err); res.status(500).send(err.message || "Error creating event ❌");
  }
});

/* UPDATE EVENT */
app.put("/events/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;
  const { title, location, eventDate, description, directTicketingEnabled, ticketTypes } = req.body;
  try {
    const existing = await sql.query`SELECT * FROM Events WHERE Id=${id}`;
    const event = existing.recordset[0]; if (!event) return res.status(404).send("Event not found ❌");
    let imageUrl=event.Image, publicId=event.PublicId, newPublicId=null;
    if (req.file) {
      const file=req.file.buffer.toString('base64');
      const uploaded=await cloudinary.uploader.upload(`data:${req.file.mimetype};base64,${file}`,{folder:'events'});
      imageUrl=uploaded.secure_url; newPublicId=uploaded.public_id; publicId=uploaded.public_id;
    }
    const types=JSON.parse(ticketTypes || '[]');
    if (!types.length) return res.status(400).send('Add at least one ticket category');
    const minPrice=Math.min(...types.map((t)=>Number(t.price)).filter(Number.isFinite));
    const tx=new sql.Transaction(); await tx.begin();
    try {
      await new sql.Request(tx)
        .input('id',sql.Int,Number(id)).input('title',sql.NVarChar,title).input('location',sql.NVarChar,location)
        .input('eventDate',sql.DateTime2,new Date(eventDate)).input('price',sql.Decimal(10,2),Number.isFinite(minPrice)?minPrice:0)
        .input('description',sql.NVarChar,description).input('image',sql.NVarChar,imageUrl).input('publicId',sql.NVarChar,publicId)
        .input('enabled',sql.Bit,String(directTicketingEnabled)!=='false'?1:0)
        .query(`UPDATE Events SET Title=@title,Location=@location,EventDate=@eventDate,Price=@price,Description=@description,Image=@image,PublicId=@publicId,TicketLink='',DirectTicketingEnabled=@enabled,TotalCapacity=0,WebsiteTicketLimit=0 WHERE Id=@id`);
      await saveEventTicketTypes(id,ticketTypes,tx); await tx.commit();
    } catch(err){ await tx.rollback(); if(newPublicId) await cloudinary.uploader.destroy(newPublicId).catch(()=>{}); throw err; }
    if(req.file && event.PublicId) await cloudinary.uploader.destroy(event.PublicId).catch(()=>{});
    res.send("Event updated successfully ✅");
  } catch(err){ console.error(err); res.status(500).send(err.message || "Error updating event ❌"); }
});

/* DELETE EVENT */
app.delete("/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await sql.query`
      SELECT Id, Title, IsDeleted
      FROM Events
      WHERE Id = ${id}
    `;

    if (existing.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found."
      });
    }

    if (existing.recordset[0].IsDeleted) {
      return res.status(400).json({
        success: false,
        message: "Event has already been deleted."
      });
    }

    const deleteTx = new sql.Transaction();
    await deleteTx.begin();

    try {
      await new sql.Request(deleteTx)
        .input("eventId", sql.Int, Number(id))
        .query(`
          UPDATE Events
          SET IsDeleted = 1
          WHERE Id = @eventId;

          UPDATE EventTicketTypes
          SET IsActive = 0, UpdatedAt = GETDATE()
          WHERE EventId = @eventId;
        `);

      await deleteTx.commit();
    } catch (deleteError) {
      await deleteTx.rollback();
      throw deleteError;
    }

    res.json({
      success: true,
      message: "Event deleted successfully."
    });

  } catch (err) {
    console.error("DELETE EVENT ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error deleting event."
    });
  }
});

/* ================= PRODUCTS ================= */

/* GET ALL PRODUCTS */
app.get("/products", async (req,res)=>{

    try{

        const result=await sql.query`

            SELECT *
            FROM Products
            ORDER BY Name

        `;

        res.json(result.recordset);

    }

    catch(err){

        console.log(err);
        res.status(500).send("Error");

    }

});

/* GET SPECIALS */
app.get("/products/specials", async (req,res)=>{

    try{

        const result=await sql.query`

            SELECT *
            FROM Products
            WHERE IsSpecial=1
            AND IsAvailable=1

            ORDER BY Name

        `;

        res.json(result.recordset);

    }

    catch(err){

        console.log(err);
        res.status(500).send("Error");

    }

});

/* ADD PRODUCT */
app.post("/products", upload.single("image"), async (req, res) => {
  const {
  name,
  price,
  category,
  isSpecial,
  isAvailable
} = req.body;

  if (!name || !price || !req.file) {
    return res.status(400).send("All fields required ❌");
  }

  try {

    const file = req.file.buffer.toString("base64");

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${file}`,
      {
        folder: "products"
      }
    );

    await sql.query`
      INSERT INTO Products
      (
    Name,
    Price,
    Image,
    PublicId,
    Category,
    IsSpecial,
    IsAvailable
      )
      VALUES
      (
    ${name},
    ${price},
    ${uploadResult.secure_url},
    ${uploadResult.public_id},
    ${category},
    ${isSpecial === "true" ? 1 : 0},
    ${isAvailable === "true" ? 1 : 0}
      )
    `;

    res.send("Product Added ✅");

  } catch(err){
    console.log(err);
    res.status(500).send("Error adding product");
  }
});

/* 📩 NEWSLETTER SUBSCRIBE */
/* SUBSCRIBE */
app.post("/subscribe", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send("Email required ❌");
  }

  try {
    // Check if email already exists
    const existing = await sql.query`
      SELECT * FROM NewsletterSubscribers
      WHERE Email = ${email}
    `;

    if (existing.recordset.length > 0) {

      // Re-activate subscriber
      await sql.query`
        UPDATE NewsletterSubscribers
        SET IsActive = 1
        WHERE Email = ${email}
      `;

      return res.send("Subscription re-activated ✅");
    }

    // New subscriber
    await sql.query`
      INSERT INTO NewsletterSubscribers (Email, IsActive)
      VALUES (${email}, 1)
    `;

    res.send("Subscribed successfully ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error subscribing ❌");
  }
});

app.get("/unsubscribe", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send("Email is required ❌");
  }

  try {
    await sql.query`
      UPDATE NewsletterSubscribers
      SET IsActive = 0
      WHERE Email = ${email}
    `;

    res.send(`
      <div style="font-family:Arial; text-align:center; padding:40px;">
        <h1>You have been unsubscribed</h1>
        <p>You will no longer receive promotional emails from <strong>All Liquors</strong>.</p>
        <a href="${FRONTEND_URL}"
           style="background:#111;color:white;padding:12px 20px;border-radius:6px;text-decoration:none;">
           Return to Store
        </a>
      </div>
    `);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error unsubscribing ❌");
  }
});

/* SEND EMAIL TO ALL USERS */
app.post("/send-email", async (req, res) => {
  const { subject, message } = req.body;

  try {
    // 🔥 GET SUBSCRIBERS
    const subscribers = await sql.query`
      SELECT Email FROM NewsletterSubscribers
      WHERE IsActive = 1
    `;

    const emails = subscribers.recordset.map(s => s.Email);

    // 🔥 GET ONLY SPECIAL PRODUCTS (STEP 2 ✅)
    const products = await sql.query`
      SELECT TOP 4 * FROM Products
      WHERE IsSpecial = 1
      ORDER BY NEWID()
    `;

    // 🔥 BUILD PRODUCT CARDS HTML
    const productCards = products.recordset.map(p => `
      <td style="padding:10px;">
        <div style="
          border:1px solid #eee;
          border-radius:10px;
          padding:10px;
          text-align:center;
        ">
          <img src="${p.Image}" width="120" style="border-radius:8px;" />

          <h4 style="font-size:14px; color:#333;">
            ${p.Name}
          </h4>

          <p style="color:#ff6600; font-weight:bold; font-size:16px;">
            R${p.Price}
          </p>

          <a href="${FRONTEND_URL}/shop"
             style="
              display:inline-block;
              padding:8px 12px;
              background:#111;
              color:#fff;
              text-decoration:none;
              border-radius:6px;
              font-size:13px;
             ">
            Buy Now
          </a>
        </div>
      </td>
    `).join("");

    // 🔥 EMAIL TEMPLATE
    const htmlTemplate = `
    <div style="background:#f6f6f6; padding:40px 0; font-family:Arial;">
      <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:10px; overflow:hidden;">

        <!-- HEADER -->
        <div style="background:#111; color:#fff; padding:20px; text-align:center;">
          <h1 style="margin:0;">All Liquors 🍾</h1>
          <p style="margin:5px 0;">Wholesale Drinks At Your Fingertips</p>
        </div>

        <!-- HERO -->
        <div style="padding:20px;">
          <h2 style="color:#333;">${subject}</h2>
          <p style="font-size:16px; color:#555;">
            ${message}
          </p>
        </div>

        <!-- 🔥 PRODUCT SECTION -->
        <div style="padding:20px;">
          <h3 style="color:#333;">🔥 Hot Deals</h3>

          <table width="100%">
            <tr>
              ${productCards || `<p>No specials available right now</p>`}
            </tr>
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align:center; margin:30px;">
          <a href="${FRONTEND_URL}/shop"
             style="background:#ff6600; color:#fff; padding:14px 25px;
                    border-radius:6px; text-decoration:none; font-weight:bold;">
            Shop Deals Now 🛒
          </a>
        </div>

        <!-- FOOTER -->
        <div style="background:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666;">
       <p>You are receiving this email because you subscribed to All Liquors promotions.</p>

       <p style="margin:10px 0;">
       <a href="${BACKEND_URL}/unsubscribe?email={{email}}"
       style="color:#666; text-decoration:underline;">
       Unsubscribe
    </a>
  </p>

  <p>All Liquors © 2026</p>
</div>

      </div>
    </div>
    `;

    // 🔥 SEND EMAIL
   for (const email of emails) {

  const personalizedHtml = htmlTemplate.replace(
    "{{email}}",
    encodeURIComponent(email)
  );

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: personalizedHtml
  });
}

    res.send("Emails with deals sent 🚀");

  } catch (err) {
    console.error("EMAIL ERROR:", err);
res.status(500).send("Email error ❌");
  }
});

app.post("/send-event-email", async (req, res) => {
  const { subject, message, event } = req.body;

  try {
    const users = await sql.query`SELECT Email FROM NewsletterSubscribers
     WHERE IsActive = 1`;

    const html = `
      <div style="font-family:sans-serif; max-width:600px; margin:auto;">
        <h2>${subject}</h2>

        <img src="${event.image}" style="width:100%; border-radius:10px;" />

        <h3>${event.title}</h3>
        <p>${event.location}</p>
        <p>${event.date}</p>

        <p>${message}</p>

        <a href="${event.ticketLink}">
          <button style="padding:10px 20px; background:black; color:white;">
            Buy Ticket 🎟️
          </button>
        </a>
      </div>
    `;

    for (let user of users.recordset) {
     await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.Email,
       subject,
      html
      });
    }

    res.send("Event emails sent ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error ❌");
  }
});

/* UPDATE PRODUCT */
app.put("/products/:id", upload.single("image"), async (req, res) => {
  const { id } = req.params;

  const {
    name,
    price,
    category,
    isSpecial,
    isAvailable
  } = req.body;

  try {

    const existing = await sql.query`
      SELECT *
      FROM Products
      WHERE Id = ${id}
    `;

    const product = existing.recordset[0];

    if (!product) {
      return res.status(404).send("Product not found ❌");
    }

    let imageUrl = product.Image;
    let publicId = product.PublicId;

    // Upload new image if selected
    if (req.file) {

      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }

      const file = req.file.buffer.toString("base64");

      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${file}`,
        {
          folder: "products"
        }
      );

      imageUrl = uploadResult.secure_url;
      publicId = uploadResult.public_id;
    }

    await sql.query`
      UPDATE Products
      SET
        Name = ${name},
        Price = ${price},
        Category = ${category},
        Image = ${imageUrl},
        PublicId = ${publicId},
        IsSpecial = ${isSpecial === "true" ? 1 : 0},
        IsAvailable = ${isAvailable === "true" ? 1 : 0}
      WHERE Id = ${id}
    `;

    res.send("Product updated ✅");

  }
  catch (err) {
    console.log(err);
    res.status(500).send("Error updating product ❌");
  }
});

app.post("/send-event-reminder", async (req, res) => {
  const { eventName, eventDate } = req.body;

  try {
    const subscribers = await sql.query`
      SELECT Email FROM NewsletterSubscribers
      WHERE IsActive = 1
    `;

    const emails = subscribers.recordset.map(s => s.Email);

    const eventTime = new Date(eventDate).getTime();
    const now = new Date().getTime();

    const diff = eventTime - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const htmlTemplate = `
    <div style="background:#f6f6f6; padding:40px; font-family:Arial;">
      <div style="max-width:600px; margin:auto; background:#fff; border-radius:10px;">

        <div style="background:#ff6600; color:white; padding:20px; text-align:center;">
          <h1>Upcoming Event 🎉</h1>
        </div>

        <div style="padding:20px; text-align:center;">
          <h2>${eventName}</h2>
          <p style="font-size:18px;">
            Starts in <strong>${days} days</strong>
          </p>

          <p>Don’t miss out on exclusive drinks & vibes 🍾</p>

          <a href="${FRONTEND_URL}/events"
             style="display:inline-block; margin-top:20px;
                    background:#000; color:white; padding:12px 20px;
                    text-decoration:none; border-radius:5px;">
            View Event
          </a>
        </div>

      </div>
    </div>
    `;

    for (const email of emails) {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `⏳ ${eventName} is coming soon!`,
    html: htmlTemplate
  });
}

    res.send("Event reminder sent 🎉");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error ❌");
  }
});


/* DELETE PRODUCT */
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;

  let transaction;

  try {
    // Get the product first
    const result = await sql.query`
      SELECT *
      FROM Products
      WHERE Id = ${id}
    `;

    const product = result.recordset[0];

    if (!product) {
      return res.status(404).send("Product not found");
    }

    // Start SQL transaction
    transaction = new sql.Transaction();

    await transaction.begin();

    // 1. Delete favourites
    await transaction.request()
      .input("productId", sql.Int, id)
      .query(`
        DELETE FROM Favorites
        WHERE ProductId = @productId
      `);

    // 2. Delete reservations
    await transaction.request()
      .input("productId", sql.Int, id)
      .query(`
        DELETE FROM Reservations
        WHERE ProductId = @productId
      `);

    // 3. Delete order items
    await transaction.request()
      .input("productId", sql.Int, id)
      .query(`
        DELETE FROM OrderItems
        WHERE ProductId = @productId
      `);

    // 4. Finally delete the product
    await transaction.request()
      .input("productId", sql.Int, id)
      .query(`
        DELETE FROM Products
        WHERE Id = @productId
      `);

    // Commit database changes
    await transaction.commit();

    // 5. Delete Cloudinary image after successful DB deletion
    if (product.PublicId) {
      try {
        await cloudinary.uploader.destroy(product.PublicId);
      } catch (cloudinaryError) {
        console.log(
          "Cloudinary image deletion failed:",
          cloudinaryError
        );
      }
    }

    res.send("Product deleted successfully");

  } catch (err) {

    console.error("Delete product error:", err);

    // Roll back database changes if something failed
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error(
          "Transaction rollback error:",
          rollbackError
        );
      }
    }

    res.status(500).send(
      "Unable to delete product"
    );
  }
});


/* ================= EMPLOYEES ================= */

app.get("/employees", async (req, res) => {
  try {
    const result = await sql.query`SELECT * FROM Employees`;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});

app.post("/employees", async (req, res) => {
  const { name, email } = req.body;

  try {
    await sql.query`
      INSERT INTO Employees (Name, Email)
      VALUES (${name}, ${email})
    `;
    res.send("Employee added ✅");
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});

app.put("/employees/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;

  try {
    await sql.query`
      UPDATE Employees
      SET Name = ${name}, Email = ${email}
      WHERE Id = ${id}
    `;
    res.send("Employee updated ✅");
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});

app.delete("/employees/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await sql.query`DELETE FROM Attendance WHERE EmployeeId = ${id}`;
    await sql.query`DELETE FROM LeaveRequests WHERE EmployeeId = ${id}`;

    await sql.query`
      DELETE FROM Employees WHERE Id = ${id}
    `;

    res.send("Employee deleted ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting employee ❌");
  }
});



/* ================= ATTENDANCE ================= */

/* GET ALL */
app.get("/attendance", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT A.*, E.Name
      FROM Attendance A
      JOIN Employees E ON A.EmployeeId = E.Id
      ORDER BY A.ClockIn DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});

/* 🔥 FILTER (NEW PROFESSIONAL FEATURE) */
app.get("/attendance/filter", async (req, res) => {
  const { startDate, endDate, employeeId, search } = req.query;

  try {
    const request = new sql.Request();
    const where = ["1=1"];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid date filter" });
      }
      request.input("startDate", sql.DateTime2, start);
      request.input("endDate", sql.DateTime2, end);
      where.push("A.ClockIn BETWEEN @startDate AND @endDate");
    }

    if (employeeId && employeeId !== "all") {
      const parsedEmployeeId = Number(employeeId);
      if (!Number.isInteger(parsedEmployeeId) || parsedEmployeeId < 1) {
        return res.status(400).json({ message: "Invalid employee filter" });
      }
      request.input("employeeId", sql.Int, parsedEmployeeId);
      where.push("A.EmployeeId = @employeeId");
    }

    if (search) {
      const safeSearch = String(search).trim().slice(0, 100);
      request.input("search", sql.NVarChar(110), `%${safeSearch}%`);
      where.push("E.Name LIKE @search");
    }

    const result = await request.query(`
      SELECT A.*, E.Name
      FROM Attendance A
      JOIN Employees E ON A.EmployeeId = E.Id
      WHERE ${where.join(" AND ")}
      ORDER BY A.ClockIn DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Attendance filter error:", err);
    res.status(500).json({ message: "Unable to filter attendance" });
  }
});

/* 🔥 MONTHLY TOTAL (ALL EMPLOYEES) */

app.get("/attendance/employee/:id", async (req, res) => {
  const { id } = req.params;
  const { month, year } = req.query;

  try {
    const result = await sql.query`
      SELECT *
      FROM Attendance
      WHERE EmployeeId = ${id}
      AND MONTH(ClockIn) = ${month}
      AND YEAR(ClockIn) = ${year}
      ORDER BY ClockIn DESC
    `;

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error ❌");
  }
});

app.get("/attendance/monthly-all", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT 
      EmployeeId,
      SUM(HoursWorked) AS TotalHours
      FROM Attendance
      WHERE ClockIn >= DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
     GROUP BY EmployeeId
    `;

    res.json(result.recordset);

  } catch (err) {
    res.status(500).send("Error ❌");
  }
});




/*  CONTACT MESSAGE */
app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).send("All fields required ❌");
  }

  try {
    await sql.query`
      INSERT INTO Messages (Name, Email, Message, Date)
      VALUES (${name}, ${email}, ${message}, GETDATE())
    `;

    res.send("Message sent successfully ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error sending message ❌");
  }
});


app.get("/messages", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT * FROM Messages ORDER BY Date DESC
    `;
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});

/* DELETE MESSAGE */
app.delete("/messages/:id", async (req, res) => {
  const { id } = req.params;

  try {

    const existing = await sql.query`
      SELECT *
      FROM Messages
      WHERE Id = ${id}
    `;

    if (existing.recordset.length === 0) {
      return res.status(404).send("Message not found");
    }

    await sql.query`
      DELETE FROM Messages
      WHERE Id = ${id}
    `;

    res.send("Message deleted successfully ✅");

  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting message ❌");
  }
});


/* CLOCK IN */
/* CLOCK IN */
app.post("/clockin", async (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).send("Employee ID is required ❌");
  }

  try {

    // Check if employee has already clocked in today
    const existing = await sql.query`
      SELECT TOP 1 *
      FROM Attendance
      WHERE EmployeeId = ${employeeId}
      AND CAST(ClockIn AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY ClockIn DESC
    `;

    if (existing.recordset.length > 0) {
      return res
        .status(400)
        .send("Employee has already clocked in today ❌");
    }

    // Clock employee in
    await sql.query`
      INSERT INTO Attendance (EmployeeId, ClockIn)
      VALUES (${employeeId}, GETDATE())
    `;

    res.send("Employee clocked in successfully ✅");

  } catch (err) {

    console.log("Clock in error:", err);

    res.status(500).send(
      "Unable to clock employee in ❌"
    );
  }
});

/* CLOCK OUT */
/* CLOCK OUT */
app.post("/clockout", async (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    return res.status(400).send("Employee ID is required ❌");
  }

  try {

    // Find today's clock-in
    const result = await sql.query`
      SELECT TOP 1 *
      FROM Attendance
      WHERE EmployeeId = ${employeeId}
      AND CAST(ClockIn AS DATE) = CAST(GETDATE() AS DATE)
      ORDER BY ClockIn DESC
    `;

    const record = result.recordset[0];

    // Employee has not clocked in today
    if (!record) {
      return res
        .status(400)
        .send("Employee has not clocked in today ❌");
    }

    // Employee already clocked out
    if (record.ClockOut) {
      return res
        .status(400)
        .send("Employee has already clocked out today ❌");
    }

    const clockIn = new Date(record.ClockIn);
    const clockOut = new Date();

    const diffMs = clockOut - clockIn;

    const hours = (
      diffMs / (1000 * 60 * 60)
    ).toFixed(2);

    await sql.query`
      UPDATE Attendance
      SET ClockOut = GETDATE(),
          HoursWorked = ${hours}
      WHERE Id = ${record.Id}
    `;

    res.send("Employee clocked out successfully ✅");

  } catch (err) {

    console.log("Clock out error:", err);

    res.status(500).send(
      "Unable to clock employee out ❌"
    );
  }
});


/* ================= LEAVE ================= */

app.get("/leave/active", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT L.*, E.Name
      FROM LeaveRequests L
      JOIN Employees E ON L.EmployeeId = E.Id
      WHERE GETDATE() BETWEEN L.StartDate AND L.EndDate
      AND Status = 'Approved'
    `;

    res.json(result.recordset);
  } catch (err) {
    res.status(500).send("Error ❌");
  }
});



/* ================= AUTH ================= */

app.post("/register", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" });
  }

  const problem = passwordProblem(password);
  if (problem) return res.status(400).json({ message: problem });

  try {
    const result = await sql.query`
      SELECT Id FROM Users WHERE LOWER(Email) = ${email}
    `;

    if (result.recordset.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const hashed = await bcrypt.hash(password, 12);

    await sql.query`
      INSERT INTO Users (Email, Password)
      VALUES (${email}, ${hashed})
    `;

    res.status(201).json({ message: "Account created successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Unable to create account" });
  }
});

app.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!isValidEmail(email) || typeof password !== "string" || !password) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const lock = getLoginLock(req, email);
  if (lock) {
    const retryAfter = Math.ceil((lock.lockedUntil - Date.now()) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many failed sign-in attempts. Please wait 15 minutes and try again.",
      retryAfter
    });
  }

  try {
    const result = await sql.query`
      SELECT Id, Email, Password, IsAdmin, IsDeleted
      FROM Users
      WHERE LOWER(Email) = ${email}
        AND ISNULL(IsDeleted, 0) = 0
    `;

    const user = result.recordset[0];
    // Keep the response identical for missing users and wrong passwords to
    // avoid leaking whether an email address is registered.
    if (!user) {
      await bcrypt.compare(password, "$2b$12$Q9Q6f6i9dAywKTSwD0rG2uAIgYyB4oA2b7aSzqVQeQi2c2wZbB4kS").catch(() => {});
      recordLoginFailure(req, email);
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.Password);
    if (!match) {
      const failureState = recordLoginFailure(req, email);
      if (failureState.lockedUntil) {
        res.setHeader("Retry-After", String(Math.ceil(LOGIN_LOCK_MS / 1000)));
        return res.status(429).json({
          message: "Too many failed sign-in attempts. Please wait 15 minutes and try again."
        });
      }
      return res.status(401).json({
        message: `Invalid email or password. ${LOGIN_MAX_FAILURES - failureState.count} attempt(s) remaining.`
      });
    }

    clearLoginFailures(req, email);
    const token = signAccessToken(user);

    res.json({
      message: "Login successful",
      token,
      expiresIn: ACCESS_TOKEN_TTL,
      user: {
        id: user.Id,
        email: user.Email,
        isAdmin: user.IsAdmin === true || user.IsAdmin === 1
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Unable to sign in" });
  }
});


app.post("/forgot-password", passwordResetLimiter, async (req, res) => {

  const email = normalizeEmail(req.body.email);

  if (!email) {
    return res.status(400).json({
      message: "Email address is required"
    });
  }

  try {

    const result = await sql.query`
      SELECT Id, Email
      FROM Users
      WHERE Email = ${email}
    `;

    const user = result.recordset[0];

    /*
      Always return the same response whether
      the email exists or not.
    */

    if (!user) {
      return res.json({
        message:
          "If an account exists for this email, an OTP has been sent."
      });
    }

    // Generate 6-digit OTP
    const otp = generateOTP();

    // Hash OTP
    const tokenHash = crypto
      .createHash("sha256")
      .update(String(otp))
      .digest("hex");

    // Invalidate previous OTPs
    await sql.query`
      UPDATE PasswordResetTokens
      SET Used = 1
      WHERE UserId = ${user.Id}
      AND Used = 0
    `;

    // Store OTP
    // SQL Server calculates expiry time
    await sql.query`
      INSERT INTO PasswordResetTokens
      (
        UserId,
        TokenHash,
        ExpiresAt,
        Used
      )
      VALUES
      (
        ${user.Id},
        ${tokenHash},
        DATEADD(MINUTE, 10, GETDATE()),
        0
      )
    `;

    // Send OTP email
    await transporter.sendMail({
      from: `"All Liquors Wholesale" <${process.env.EMAIL_USER}>`,
      to: user.Email,
      subject: "All Liquors Password Reset",

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 30px;
          color: #111827;
        ">

          <h2>Password Reset</h2>

          <p>
            We received a request to reset your
            All Liquors Wholesale account password.
          </p>

          <p>
            Your verification code is:
          </p>

          <div style="
            background: #111827;
            color: #d4af37;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            text-align: center;
            padding: 18px;
            border-radius: 10px;
            margin: 25px 0;
          ">
            ${otp}
          </div>

          <p>
            This code will expire in
            <strong>10 minutes</strong>.
          </p>

          <p>
            If you did not request a password reset,
            you can safely ignore this email.
          </p>

          <hr style="
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 30px 0;
          ">

          <p style="
            color: #6b7280;
            font-size: 13px;
          ">
            All Liquors Wholesale
          </p>

        </div>
      `
    });

    res.json({
      message:
        "If an account exists for this email, an OTP has been sent."
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Unable to process password reset request"
    });
  }
});


app.post("/verify-reset-otp", async (req, res) => {

  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();

  if (!email || !otp) {
    return res.status(400).json({
      message: "Email and OTP are required"
    });
  }

  // OTP must be exactly 6 digits
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message: "OTP must be 6 digits"
    });
  }

  try {

    const userResult = await sql.query`
      SELECT Id
      FROM Users
      WHERE Email = ${email}
    `;

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    /*
      Hash the EXACT same normalized OTP
      that was entered by the customer.
    */
    const tokenHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const result = await sql.query`
      SELECT TOP 1
        Id,
        UserId,
        TokenHash,
        ExpiresAt,
        Used
      FROM PasswordResetTokens
      WHERE UserId = ${user.Id}
      AND TokenHash = ${tokenHash}
      AND Used = 0
      AND ExpiresAt > GETDATE()
      ORDER BY ExpiresAt DESC
    `;

    const token = result.recordset[0];

    if (!token) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    res.json({
      message: "OTP verified successfully",
      verified: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

app.put("/reset-password", async (req, res) => {

  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp || "").trim();
  const newPassword = req.body.newPassword;

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      message: "Email, OTP and new password are required"
    });
  }

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      message: "OTP must be 6 digits"
    });
  }

  const problem = passwordProblem(newPassword);
  if (problem) {
    return res.status(400).json({ message: problem });
  }

  try {

    const userResult = await sql.query`
      SELECT Id
      FROM Users
      WHERE Email = ${email}
    `;

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(400).json({
        message: "Invalid password reset request"
      });
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(otp)
      .digest("hex");

    const tokenResult = await sql.query`
      SELECT TOP 1
        Id,
        UserId,
        TokenHash,
        ExpiresAt,
        Used
      FROM PasswordResetTokens
      WHERE UserId = ${user.Id}
      AND TokenHash = ${tokenHash}
      AND Used = 0
      AND ExpiresAt > GETDATE()
      ORDER BY ExpiresAt DESC
    `;

    const token = tokenResult.recordset[0];

    if (!token) {
      return res.status(400).json({
        message: "Invalid or expired OTP"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      12
    );

    // Update password
    await sql.query`
      UPDATE Users
      SET Password = ${hashedPassword}
      WHERE Id = ${user.Id}
    `;

    // Make OTP unusable
    await sql.query`
      UPDATE PasswordResetTokens
      SET Used = 1
      WHERE Id = ${token.Id}
    `;

    res.json({
      message: "Password updated successfully"
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      message: "Server error"
    });
  }
});

/* ================= USERS / ADMINS ================= */

// Get all active users
app.get("/users", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT Id, Email, IsAdmin, IsDeleted
      FROM Users
      WHERE ISNULL(IsDeleted, 0) = 0
      ORDER BY Email
    `;

    res.json(result.recordset);

  } catch (err) {
    console.error("GET USERS ERROR:", err);
    res.status(500).send("Error fetching users ❌");
  }
});


// Make user admin
app.put("/users/:id/make-admin", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await sql.query`
      UPDATE Users
      SET IsAdmin = 1
      WHERE Id = ${id}
        AND ISNULL(IsDeleted, 0) = 0
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("User not found.");
    }

    res.send("User promoted to admin ✅");

  } catch (err) {
    console.error("MAKE ADMIN ERROR:", err);
    res.status(500).send("Error promoting user ❌");
  }
});


// Remove admin rights
app.put("/users/:id/remove-admin", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await sql.query`
      UPDATE Users
      SET IsAdmin = 0
      WHERE Id = ${id}
        AND ISNULL(IsDeleted, 0) = 0
    `;

    if (result.rowsAffected[0] === 0) {
      return res.status(404).send("User not found.");
    }

    res.send("Admin rights removed ✅");

  } catch (err) {
    console.error("REMOVE ADMIN ERROR:", err);
    res.status(500).send("Error removing admin ❌");
  }
});


// Soft delete user
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;

  try {

    // Find the user
    const existing = await sql.query`
      SELECT Id, Email, IsAdmin, IsDeleted
      FROM Users
      WHERE Id = ${id}
    `;

    if (existing.recordset.length === 0) {
      return res.status(404).send("User not found.");
    }

    const user = existing.recordset[0];

    // Prevent deleting an admin
    if (user.IsAdmin) {
      return res.status(400).send("Admin accounts cannot be deleted.");
    }

    // Check if already deleted
    if (user.IsDeleted === 1) {
      return res.status(400).send("User has already been deleted.");
    }

    // SOFT DELETE
    // We do NOT DELETE FROM Users.
    // This preserves Orders.UserId foreign-key relationships.
    await sql.query`
      UPDATE Users
      SET IsDeleted = 1
      WHERE Id = ${id}
    `;

    res.json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (err) {
    console.error("DELETE USER ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Error deleting user"
    });
  }
});


/* ================= BASIC PURCHASE RATE LIMIT ================= */
const ticketPurchaseAttempts = new Map();
function ticketPurchaseRateLimit(req, res, next) {
  const key = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 12;
  const current = ticketPurchaseAttempts.get(key) || [];
  const recent = current.filter((ts) => now - ts < windowMs);
  if (recent.length >= max) {
    return res.status(429).json({ message: "Too many checkout attempts. Please wait a minute and try again." });
  }
  recent.push(now);
  ticketPurchaseAttempts.set(key, recent);
  next();
}

/* ================= PAY & COLLECT ORDERS ================= */

const SERVICE_FEE_PERCENT = 8.0;
// Paystack South Africa Pay-by-Bank checkout.
// `eft` is the hosted-checkout channel for EFT/Pay-by-Bank.
// Paystack currently lists Ozow EFT and Capitec Pay at 2% with no flat fee.
const PAYSTACK_CHANNELS = ["eft"];
const PAYSTACK_EFT_RATE = 0.02;
const PAYSTACK_FEE_VAT_RATE = 0.15;
const COLLECTION_HOLD_HOURS = 48;
const TERMS_VERSION = "2026-08-pay-collect-v1";

function createOrderNumber() {
  return `AL-${Date.now()}-${crypto.randomInt(1000, 10000)}`;
}

function createCollectionCode() {
  return `AL-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/* CREATE ORDER + START FULL-PAYMENT PAYSTACK CHECKOUT
   Supports both the original single-product checkout and the shopping basket. */
app.post("/orders/initialize", async (req, res) => {
  const {
    userId,
    productId,
    quantity,
    items,
    termsAccepted
  } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "User is required" });
  }

  if (!termsAccepted) {
    return res.status(400).json({
      message: "You must agree to the Terms & Conditions before payment"
    });
  }

  // Backward compatible: direct Pay Now still sends productId + quantity.
  const requestedItems = Array.isArray(items) && items.length
    ? items
    : productId
      ? [{ productId, quantity: quantity || 1 }]
      : [];

  if (requestedItems.length === 0) {
    return res.status(400).json({ message: "Add at least one product to your order" });
  }

  if (requestedItems.length > 50) {
    return res.status(400).json({ message: "Too many different products in one order" });
  }

  // Merge duplicate product IDs and validate quantities.
  const quantityByProduct = new Map();

  for (const item of requestedItems) {
    const id = Number(item.productId);
    const qty = Number(item.quantity || 1);

    if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      return res.status(400).json({ message: "One or more basket items have an invalid quantity" });
    }

    const nextQuantity = (quantityByProduct.get(id) || 0) + qty;

    if (nextQuantity > 99) {
      return res.status(400).json({
        message: "Maximum quantity is 99 per product in one order"
      });
    }

    quantityByProduct.set(id, nextQuantity);
  }

  const cleanedItems = [...quantityByProduct.entries()].map(([id, qty]) => ({
    productId: id,
    quantity: qty
  }));

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  const developerSubaccount = process.env.PAYSTACK_DEV_SUBACCOUNT?.trim();

  if (!secretKey || secretKey.includes("xxxxxxxx")) {
    return res.status(500).json({ message: "Paystack secret key is not configured" });
  }

  if (!developerSubaccount || developerSubaccount.includes("xxxxxxxx")) {
    return res.status(500).json({ message: "Paystack developer subaccount is not configured" });
  }

  try {
    const userResult = await sql.query`
      SELECT Id, Email
      FROM Users
      WHERE Id = ${userId}
        AND ISNULL(IsDeleted, 0) = 0
    `;

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Never trust product names or prices coming from localStorage/frontend.
    // Read every item from SQL Server and calculate the order server-side.
    const orderProducts = [];

    for (const requested of cleanedItems) {
      const productResult = await sql.query`
        SELECT Id, Name, Price, IsAvailable, Image
        FROM Products
        WHERE Id = ${requested.productId}
      `;

      const product = productResult.recordset[0];

      if (!product) {
        return res.status(404).json({
          message: `A product in your basket is no longer available.`
        });
      }

      if (!product.IsAvailable) {
        return res.status(409).json({
          message: `${product.Name} is currently unavailable. Remove it from your basket to continue.`
        });
      }

      orderProducts.push({
        ...product,
        Quantity: requested.quantity,
        UnitPrice: Number(product.Price),
        LineTotal: Number((Number(product.Price) * requested.quantity).toFixed(2))
      });
    }

    const subtotal = Number(
      orderProducts.reduce((sum, item) => sum + item.LineTotal, 0).toFixed(2)
    );

    const serviceFeeAmount = Number(
      (subtotal * (SERVICE_FEE_PERCENT / 100)).toFixed(2)
    );

    const effectivePaystackRate = PAYSTACK_EFT_RATE * (1 + PAYSTACK_FEE_VAT_RATE);
    const amountBeforeProcessingFee = subtotal + serviceFeeAmount;

    const customerProcessingFeeAmount = Number(
      (
        (amountBeforeProcessingFee * effectivePaystackRate) /
        (1 - effectivePaystackRate)
      ).toFixed(2)
    );

    const totalAmount = Number(
      (amountBeforeProcessingFee + customerProcessingFeeAmount).toFixed(2)
    );

    // Production split:
    // - All Liquors is the Paystack MAIN account.
    // - The developer is the Paystack SUBACCOUNT and receives the 8% service fee.
    // - The customer funds the 8% service fee plus the processing allowance.
    // - The main account bears Paystack's fee, so the processing allowance keeps
    //   the business at approximately the full product subtotal after processing.
    const businessShareAmount = subtotal;
    const mainAccountChargeAmount = Number(
      (subtotal + customerProcessingFeeAmount).toFixed(2)
    );

    const orderNumber = createOrderNumber();
    const collectionCode = createCollectionCode();
    const termsAcceptedAt = new Date();

    let orderId;
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      const orderInsert = await new sql.Request(transaction)
        .input("userId", sql.Int, Number(userId))
        .input("orderNumber", sql.NVarChar(40), orderNumber)
        .input("collectionCode", sql.NVarChar(40), collectionCode)
        .input("subtotal", sql.Decimal(10, 2), subtotal)
        .input("totalAmount", sql.Decimal(10, 2), totalAmount)
        .input("serviceFee", sql.Decimal(10, 2), serviceFeeAmount)
        .input("processingFee", sql.Decimal(10, 2), customerProcessingFeeAmount)
        .input("businessShare", sql.Decimal(10, 2), businessShareAmount)
        .input("feePercent", sql.Decimal(5, 2), SERVICE_FEE_PERCENT)
        .input("termsAcceptedAt", sql.DateTime, termsAcceptedAt)
        .input("termsVersion", sql.NVarChar(30), TERMS_VERSION)
        .query(`
          INSERT INTO Orders
          (
            UserId, OrderNumber, CollectionCode, Subtotal, TotalAmount,
            ServiceFeeAmount, CustomerProcessingFeeAmount, BusinessShareAmount,
            ServiceFeePercent, PaymentStatus, CollectionStatus,
            TermsAcceptedAt, TermsVersion
          )
          OUTPUT INSERTED.Id
          VALUES
          (
            @userId, @orderNumber, @collectionCode, @subtotal, @totalAmount,
            @serviceFee, @processingFee, @businessShare,
            @feePercent, 'pending', 'pending',
            @termsAcceptedAt, @termsVersion
          )
        `);

      orderId = orderInsert.recordset[0].Id;

      for (const item of orderProducts) {
        await new sql.Request(transaction)
          .input("orderId", sql.Int, orderId)
          .input("productId", sql.Int, Number(item.Id))
          .input("productName", sql.NVarChar(255), item.Name)
          .input("unitPrice", sql.Decimal(10, 2), item.UnitPrice)
          .input("quantity", sql.Int, item.Quantity)
          .query(`
            INSERT INTO OrderItems
            (OrderId, ProductId, ProductName, UnitPrice, Quantity)
            VALUES
            (@orderId, @productId, @productName, @unitPrice, @quantity)
          `);
      }

      await transaction.commit();
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }

    const reference = `${orderNumber}-${Date.now()}`;

    await sql.query`
      UPDATE Orders
      SET PaystackReference = ${reference}, UpdatedAt = GETDATE()
      WHERE Id = ${orderId}
    `;

    try {
      const amountInKobo = Math.round(totalAmount * 100);
      const mainAccountChargeInKobo = Math.round(mainAccountChargeAmount * 100);

      const paystackResponse = await paystack.post("/transaction/initialize", {
        email: user.Email,
        amount: amountInKobo,
        currency: "ZAR",
        reference,
        callback_url: `${process.env.FRONTEND_URL}/orders/callback`,
        subaccount: developerSubaccount,
        transaction_charge: mainAccountChargeInKobo,
        bearer: "account",
        metadata: {
          orderId,
          orderNumber,
          collectionCode,
          userId,
          itemCount: orderProducts.reduce((sum, item) => sum + item.Quantity, 0),
          items: orderProducts.map((item) => ({
            productId: item.Id,
            name: item.Name,
            quantity: item.Quantity,
            unitPrice: item.UnitPrice
          })),
          subtotal,
          serviceFeeAmount,
          customerProcessingFeeAmount,
          totalAmount,
          termsVersion: TERMS_VERSION
        }
      });

      return res.json({
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference,
        orderNumber,
        totalAmount,
        subtotal,
        serviceFeeAmount,
        customerProcessingFeeAmount,
        businessShareAmount,
        collectionCode,
        itemCount: orderProducts.reduce((sum, item) => sum + item.Quantity, 0)
      });
    } catch (paystackError) {
      const paystackData = paystackError.response?.data;

      console.error(
        "Paystack initialization failed:",
        paystackData || paystackError.message || paystackError
      );

      await sql.query`
        UPDATE Orders
        SET PaymentStatus = 'failed', UpdatedAt = GETDATE()
        WHERE Id = ${orderId}
          AND PaymentStatus = 'pending'
      `;

      const detail = paystackData?.message || paystackData?.data?.message;

      return res.status(502).json({
        message: detail
          ? `Paystack: ${detail}`
          : "Paystack could not initialize the payment. Check the backend console for details."
      });
    }
  } catch (err) {
    console.error("ORDER INITIALIZE ERROR:", err.response?.data || err);
    res.status(500).json({
      message: "Unable to start payment. Please try again."
    });
  }
});

/* VERIFY PAYMENT AFTER PAYSTACK REDIRECT */
app.get("/orders/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const verifyResponse = await paystack.get(`/transaction/verify/${reference}`);
    const data = verifyResponse.data.data;

    const orderResult = await sql.query`
      SELECT
        o.*,
        u.Email,
        u.Id AS CustomerId
      FROM Orders o
      JOIN Users u ON u.Id = o.UserId
      WHERE o.PaystackReference = ${reference}
    `;

    const order = orderResult.recordset[0];

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!req.user.isAdmin && Number(order.UserId) !== req.user.id) {
      return res.status(403).json({ message: "You cannot verify another customer's order" });
    }

    const expectedAmount = Math.round(Number(order.TotalAmount) * 100);
    const paidAmount = Number(data.amount);
    const paidCurrency = String(data.currency || "").toUpperCase();
    const paymentChannel = String(data.channel || "").toLowerCase();

    // Never mark an order as paid from the redirect alone.
    // Paystack must confirm success, the exact amount, and ZAR.
    if (
      data.status === "success" &&
      paidAmount === expectedAmount &&
      paidCurrency === "ZAR" 
    ) {
      if (order.PaymentStatus !== "paid") {
        await sql.query`
          UPDATE Orders
          SET PaymentStatus = 'paid',
              CollectionStatus = 'pending',
              PaidAt = GETDATE(),
              ExpiresAt = DATEADD(HOUR, ${COLLECTION_HOLD_HOURS}, GETDATE()),
              UpdatedAt = GETDATE()
          WHERE Id = ${order.Id}
        `;

        const items = await sql.query`
          SELECT ProductName, UnitPrice, Quantity
          FROM OrderItems
          WHERE OrderId = ${order.Id}
        `;

        const itemRows = items.recordset.map(item => `
          <tr>
            <td style="padding:8px 0;">${item.ProductName} × ${item.Quantity}</td>
            <td style="padding:8px 0;text-align:right;">R${Number(item.UnitPrice * item.Quantity).toFixed(2)}</td>
          </tr>
        `).join("");

        await transporter.sendMail({
          from: `"All Liquors Wholesale" <${process.env.EMAIL_USER}>`,
          to: order.Email,
          subject: `Payment confirmed — ${order.OrderNumber}`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:30px;color:#111827;">
              <h2 style="margin-bottom:8px;">Payment confirmed</h2>
              <p>Thank you. Your Pay &amp; Collect order <strong>${order.OrderNumber}</strong> has been paid successfully.</p>
              <div style="background:#111827;color:#d4af37;padding:20px;border-radius:12px;text-align:center;margin:22px 0;">
                <div style="font-size:13px;color:#fff;margin-bottom:8px;">COLLECTION CODE</div>
                <div style="font-size:28px;font-weight:800;letter-spacing:4px;">${order.CollectionCode}</div>
              </div>
              <p>Please show this code at the till when collecting your order.</p>
              <p><strong>Collection window:</strong> ${COLLECTION_HOLD_HOURS} hours after payment.</p>
              <table style="width:100%;border-collapse:collapse;margin:20px 0;">${itemRows}</table>
              <p style="margin:6px 0;">Product subtotal: <strong>R${Number(order.Subtotal).toFixed(2)}</strong></p>
              <p style="margin:6px 0;">Online service fee: <strong>R${Number(order.ServiceFeeAmount).toFixed(2)}</strong></p>
              <p style="margin:6px 0;">Payment processing fee: <strong>R${Number(order.CustomerProcessingFeeAmount || 0).toFixed(2)}</strong></p>
              <p style="font-size:18px;font-weight:700;">Total paid: R${Number(order.TotalAmount).toFixed(2)}</p>
              <p style="color:#6b7280;font-size:13px;">Your paid order is held for collection for 48 hours. Please review the Terms &amp; Conditions for the applicable non-refundable purchase terms.</p>
            </div>
          `
        });
      }

      const latest = await sql.query`
        SELECT Id, OrderNumber, CollectionCode, TotalAmount, PaymentStatus, CollectionStatus, ExpiresAt
        FROM Orders WHERE Id = ${order.Id}
      `;

      return res.json({
        status: "success",
        message: "Payment confirmed",
        order: latest.recordset[0]
      });
    }

    if (order.PaymentStatus !== "paid") {
      await sql.query`
        UPDATE Orders
        SET PaymentStatus = 'failed', UpdatedAt = GETDATE()
        WHERE Id = ${order.Id}
        AND PaymentStatus = 'pending'
      `;
    }

    res.json({
      status: "failed",
      message:
        data.status === "success"
          ? "Payment could not be verified against the order amount."
          : "Payment was not completed"
    });
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json({ message: "Unable to verify payment" });
  }
});

/* PAYSTACK WEBHOOK — BACKUP PAYMENT CONFIRMATION */
app.post("/paystack/webhook", async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.body)
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(401);
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === "charge.success") {
      const reference = event.data.reference;
      const paidAmount = Number(event.data.amount);
      const paidCurrency = String(event.data.currency || "").toUpperCase();
      const paymentChannel = String(event.data.channel || "").toLowerCase();

      if (String(reference || "").startsWith("ET-")) {
        try {
          await confirmEventTicketPayment(reference, {
            status: "success", amount: paidAmount, currency: paidCurrency, channel: paymentChannel
          });
        } catch (ticketErr) {
          console.error("Event ticket webhook confirmation error:", ticketErr);
        }
      } else if (String(reference || "").startsWith("ER-")) {
        const resortResult = await sql.query`
          SELECT Id, TotalAmount, PaymentStatus
          FROM ResortBookings
          WHERE PaystackReference = ${reference}
        `;

        const resortBooking = resortResult.recordset[0];

        if (
          resortBooking &&
          paidAmount === Math.round(Number(resortBooking.TotalAmount) * 100) &&
          paidCurrency === "ZAR" 
        ) {
          await sql.query`
            UPDATE ResortBookings
            SET PaymentStatus = 'paid',
                BookingStatus = CASE WHEN BookingStatus = 'pending' THEN 'confirmed' ELSE BookingStatus END,
                PaidAt = COALESCE(PaidAt, GETDATE()),
                UpdatedAt = GETDATE()
            WHERE Id = ${resortBooking.Id}
            AND PaymentStatus != 'paid'
          `;

          await sendResortBookingConfirmation(resortBooking.Id);
        }
      } else {
        const orderResult = await sql.query`
          SELECT Id, TotalAmount, PaymentStatus
          FROM Orders
          WHERE PaystackReference = ${reference}
        `;

        const order = orderResult.recordset[0];

        if (
          order &&
          paidAmount === Math.round(Number(order.TotalAmount) * 100) &&
          paidCurrency === "ZAR" 
        ) {
          await sql.query`
            UPDATE Orders
            SET PaymentStatus = 'paid',
                CollectionStatus = 'pending',
                PaidAt = COALESCE(PaidAt, GETDATE()),
                ExpiresAt = COALESCE(ExpiresAt, DATEADD(HOUR, ${COLLECTION_HOLD_HOURS}, GETDATE())),
                UpdatedAt = GETDATE()
            WHERE Id = ${order.Id}
            AND PaymentStatus != 'paid'
          `;
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

/* GET A USER'S ORDER HISTORY - ONE RECORD PER ORDER */
app.get("/orders/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const ordersResult = await sql.query`
      SELECT *
      FROM Orders
      WHERE UserId = ${userId}
      ORDER BY CreatedAt DESC
    `;

    const orders = [];

    for (const order of ordersResult.recordset) {
      const itemsResult = await sql.query`
        SELECT
          oi.Id,
          oi.ProductId,
          oi.ProductName,
          oi.UnitPrice,
          oi.Quantity,
          p.Image AS ProductImage,
          p.Category
        FROM OrderItems oi
        LEFT JOIN Products p ON p.Id = oi.ProductId
        WHERE oi.OrderId = ${order.Id}
        ORDER BY oi.Id ASC
      `;

      orders.push({
        ...order,
        Items: itemsResult.recordset
      });
    }

    res.json(orders);
  } catch (err) {
    console.error("GET USER ORDERS ERROR:", err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

/* GET ONE CUSTOMER ORDER / COLLECTION DETAILS */
app.get("/orders/user/:userId/:orderId", async (req, res) => {
  const { userId, orderId } = req.params;

  try {
    const orderResult = await sql.query`
      SELECT *
      FROM Orders
      WHERE Id = ${orderId}
        AND UserId = ${userId}
    `;

    const order = orderResult.recordset[0];

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const itemsResult = await sql.query`
      SELECT
        oi.Id,
        oi.ProductId,
        oi.ProductName,
        oi.UnitPrice,
        oi.Quantity,
        p.Image AS ProductImage,
        p.Category
      FROM OrderItems oi
      LEFT JOIN Products p ON p.Id = oi.ProductId
      WHERE oi.OrderId = ${orderId}
      ORDER BY oi.Id ASC
    `;

    res.json({
      ...order,
      Items: itemsResult.recordset
    });
  } catch (err) {
    console.error("GET CUSTOMER ORDER ERROR:", err);
    res.status(500).json({ message: "Error fetching order" });
  }
});

/* ADMIN: GET ALL ORDERS */
app.get("/orders", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT
        o.*,
        oi.ProductId,
        oi.ProductName,
        oi.UnitPrice,
        oi.Quantity,
        p.Image AS ProductImage,
        u.Email AS UserEmail
      FROM Orders o
      JOIN OrderItems oi ON oi.OrderId = o.Id
      LEFT JOIN Products p ON p.Id = oi.ProductId
      JOIN Users u ON u.Id = o.UserId
      ORDER BY o.CreatedAt DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error fetching orders" });
  }
});

/* ADMIN: UPDATE COLLECTION STATUS */
app.put("/orders/:id/collection-status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["pending", "ready", "collected", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid collection status" });
  }

  try {
    const existing = await sql.query`
      SELECT o.*, oi.ProductName, oi.Quantity, u.Email
      FROM Orders o
      JOIN OrderItems oi ON oi.OrderId = o.Id
      JOIN Users u ON u.Id = o.UserId
      WHERE o.Id = ${id}
    `;

    const order = existing.recordset[0];

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.PaymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid orders can be prepared for collection" });
    }

    if (status === "collected" && order.CollectionStatus === "expired") {
      return res.status(400).json({ message: "This order has expired and cannot be marked collected" });
    }

    await sql.query`
      UPDATE Orders
      SET CollectionStatus = ${status},
          CollectedAt = ${status === "collected" ? new Date() : null},
          UpdatedAt = GETDATE()
      WHERE Id = ${id}
    `;

    if (status === "ready") {
      await transporter.sendMail({
        from: `"All Liquors Wholesale" <${process.env.EMAIL_USER}>`,
        to: order.Email,
        subject: `Your order is ready for collection — ${order.OrderNumber}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:30px;color:#111827;">
            <h2>Your order is ready for collection</h2>
            <p><strong>${order.OrderNumber}</strong> is ready and waiting for you at All Liquors.</p>
            <div style="background:#111827;color:#d4af37;padding:20px;border-radius:12px;text-align:center;margin:22px 0;">
              <div style="font-size:13px;color:#fff;margin-bottom:8px;">COLLECTION CODE</div>
              <div style="font-size:28px;font-weight:800;letter-spacing:4px;">${order.CollectionCode}</div>
            </div>
            <p>Please show the collection code at the till.</p>
            <p>Your order must be collected within the 48-hour collection window shown in your account.</p>
          </div>
        `
      });
    }

    res.json({ message: `Order marked as ${status}` });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error updating order status" });
  }
});

/* AUTO-EXPIRE PAID ORDERS AFTER THE 48-HOUR COLLECTION WINDOW */
setInterval(async () => {
  try {
    await sql.query`
      UPDATE Orders
      SET CollectionStatus = 'expired', UpdatedAt = GETDATE()
      WHERE PaymentStatus = 'paid'
      AND CollectionStatus IN ('pending', 'ready')
      AND ExpiresAt < GETDATE()
    `;
  } catch (err) {
    console.log("Order expiry check failed:", err);
  }
}, 15 * 60 * 1000);


/* ================= ELEPHANT RESORT BOOKINGS ================= */

const RESORT_ADULT_PRICE = 70;
const RESORT_CHILD_PRICE = 50;
const RESORT_SERVICE_FEE_PERCENT = 8.0;
const RESORT_TERMS_VERSION = "2026-08-elephant-resort-v2-internal-split";

function createResortBookingNumber() {
  return `ER-${Date.now()}-${crypto.randomInt(1000, 10000)}`;
}

function createResortEntryCode() {
  return `ER-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function calculateResortTotals(adults, children) {
  // Elephant Resort uses an internal 8% developer commission split.
  // The customer does NOT pay the 8% service fee on top of admission.
  // The customer only covers the Paystack/EFT processing fee.
  const admissionAmount = Number(
    ((adults * RESORT_ADULT_PRICE) + (children * RESORT_CHILD_PRICE)).toFixed(2)
  );

  const serviceFeeAmount = Number(
    (admissionAmount * (RESORT_SERVICE_FEE_PERCENT / 100)).toFixed(2)
  );

  const businessShareAmount = Number(
    (admissionAmount - serviceFeeAmount).toFixed(2)
  );

  const effectivePaystackRate = PAYSTACK_EFT_RATE * (1 + PAYSTACK_FEE_VAT_RATE);

  // Gross-up only the advertised admission amount so the processing fee is
  // covered by the customer without adding the 8% platform share to checkout.
  const customerProcessingFeeAmount = Number(
    (
      (admissionAmount * effectivePaystackRate) /
      (1 - effectivePaystackRate)
    ).toFixed(2)
  );

  const totalAmount = Number(
    (admissionAmount + customerProcessingFeeAmount).toFixed(2)
  );

  // Production split:
  // - All Liquors is the Paystack MAIN account and receives the 92% resort share
  //   plus the customer-funded processing allowance.
  // - The developer SUBACCOUNT receives the 8% commission.
  // - The main account bears Paystack's fee.
  const mainAccountChargeAmount = Number(
    (businessShareAmount + customerProcessingFeeAmount).toFixed(2)
  );

  return {
    admissionAmount,
    serviceFeeAmount,
    customerProcessingFeeAmount,
    businessShareAmount,
    totalAmount,
    mainAccountChargeAmount
  };
}

async function sendResortBookingConfirmation(bookingId) {
  const result = await sql.query`
    SELECT rb.*, u.Email
    FROM ResortBookings rb
    JOIN Users u ON u.Id = rb.UserId
    WHERE rb.Id = ${bookingId}
  `;

  const booking = result.recordset[0];

  if (!booking || booking.ConfirmationEmailSentAt) {
    return;
  }

  const visitDate = new Date(booking.VisitDate).toLocaleDateString("en-ZA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  await transporter.sendMail({
    from: `"All Liquors Wholesale" <${process.env.EMAIL_USER}>`,
    to: booking.Email,
    subject: `Elephant Resort booking confirmed — ${booking.BookingNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;padding:30px;color:#111827;">
        <p style="font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#b8860b;margin:0 0 8px;">Elephant Resort</p>
        <h2 style="margin:0 0 10px;">Your visit is confirmed</h2>
        <p>Thank you. Your Elephant Resort admission has been paid successfully.</p>

        <div style="background:#111827;color:#fff;padding:22px;border-radius:14px;margin:24px 0;">
          <div style="font-size:12px;color:#d4af37;letter-spacing:1.4px;margin-bottom:8px;">ENTRY CODE</div>
          <div style="font-size:28px;font-weight:800;letter-spacing:4px;color:#d4af37;">${booking.EntryCode}</div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr><td style="padding:7px 0;color:#6b7280;">Booking number</td><td style="padding:7px 0;text-align:right;font-weight:700;">${booking.BookingNumber}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Visit date</td><td style="padding:7px 0;text-align:right;font-weight:700;">${visitDate}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Adults</td><td style="padding:7px 0;text-align:right;font-weight:700;">${booking.Adults}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Children (3+)</td><td style="padding:7px 0;text-align:right;font-weight:700;">${booking.Children}</td></tr>
          <tr><td style="padding:7px 0;color:#6b7280;">Children (0–2)</td><td style="padding:7px 0;text-align:right;font-weight:700;">${booking.Infants}</td></tr>
        </table>

        <p style="margin:6px 0;">Admission: <strong>R${Number(booking.AdmissionAmount).toFixed(2)}</strong></p>
        <p style="margin:6px 0;">Payment processing fee: <strong>R${Number(booking.CustomerProcessingFeeAmount).toFixed(2)}</strong></p>
        <p style="font-size:18px;font-weight:800;">Total paid: R${Number(booking.TotalAmount).toFixed(2)}</p>

        <p style="margin-top:24px;">Please show your entry code when arriving at Elephant Resort.</p>
        <p style="color:#6b7280;font-size:13px;">Open Monday to Sunday. Your booking is valid for the selected visit date.</p>
      </div>
    `
  });

  await sql.query`
    UPDATE ResortBookings
    SET ConfirmationEmailSentAt = GETDATE(), UpdatedAt = GETDATE()
    WHERE Id = ${bookingId}
    AND ConfirmationEmailSentAt IS NULL
  `;
}

/* CREATE RESORT BOOKING + START PAYSTACK CHECKOUT */
app.post("/resort/bookings/initialize", async (req, res) => {
  const {
    userId,
    visitDate,
    adults,
    children,
    infants,
    termsAccepted
  } = req.body;

  const safeAdults = Number(adults || 0);
  const safeChildren = Number(children || 0);
  const safeInfants = Number(infants || 0);

  if (!userId || !visitDate) {
    return res.status(400).json({ message: "User and visit date are required" });
  }

  if (!termsAccepted) {
    return res.status(400).json({
      message: "You must agree to the Terms & Conditions before payment"
    });
  }

  if (
    !Number.isInteger(safeAdults) ||
    !Number.isInteger(safeChildren) ||
    !Number.isInteger(safeInfants) ||
    safeAdults < 1 ||
    safeChildren < 0 ||
    safeInfants < 0 ||
    safeAdults + safeChildren + safeInfants > 50
  ) {
    return res.status(400).json({
      message: "Please select a valid number of visitors. At least one adult is required."
    });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(visitDate)) {
    return res.status(400).json({ message: "Invalid visit date" });
  }

  const requestedVisitDate = new Date(`${visitDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(requestedVisitDate.getTime()) || requestedVisitDate < today) {
    return res.status(400).json({ message: "Visit date cannot be in the past" });
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  const developerSubaccount = process.env.PAYSTACK_DEV_SUBACCOUNT?.trim();

  if (!secretKey || secretKey.includes("xxxxxxxx")) {
    return res.status(500).json({ message: "Paystack secret key is not configured" });
  }

  if (!developerSubaccount || developerSubaccount.includes("xxxxxxxx")) {
    return res.status(500).json({
      message: "Paystack developer subaccount is not configured"
    });
  }

  try {
    const userResult = await sql.query`
      SELECT Id, Email
      FROM Users
      WHERE Id = ${userId}
      AND ISNULL(IsDeleted, 0) = 0
    `;

    const user = userResult.recordset[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const totals = calculateResortTotals(safeAdults, safeChildren);

    if (totals.admissionAmount <= 0) {
      return res.status(400).json({ message: "Booking must include at least one paid visitor" });
    }

    const bookingNumber = createResortBookingNumber();
    const entryCode = createResortEntryCode();
    const termsAcceptedAt = new Date();

    const insertResult = await sql.query`
      INSERT INTO ResortBookings
      (
        UserId,
        BookingNumber,
        EntryCode,
        VisitDate,
        Adults,
        Children,
        Infants,
        AdmissionAmount,
        ServiceFeeAmount,
        CustomerProcessingFeeAmount,
        BusinessShareAmount,
        TotalAmount,
        ServiceFeePercent,
        PaymentStatus,
        BookingStatus,
        TermsAcceptedAt,
        TermsVersion
      )
      OUTPUT INSERTED.Id
      VALUES
      (
        ${userId},
        ${bookingNumber},
        ${entryCode},
        CAST(${visitDate} AS DATE),
        ${safeAdults},
        ${safeChildren},
        ${safeInfants},
        ${totals.admissionAmount},
        ${totals.serviceFeeAmount},
        ${totals.customerProcessingFeeAmount},
        ${totals.businessShareAmount},
        ${totals.totalAmount},
        ${RESORT_SERVICE_FEE_PERCENT},
        'pending',
        'pending',
        ${termsAcceptedAt},
        ${RESORT_TERMS_VERSION}
      )
    `;

    const bookingId = insertResult.recordset[0].Id;
    const reference = `${bookingNumber}-${Date.now()}`;

    await sql.query`
      UPDATE ResortBookings
      SET PaystackReference = ${reference}, UpdatedAt = GETDATE()
      WHERE Id = ${bookingId}
    `;

    try {
      const paystackResponse = await paystack.post("/transaction/initialize", {
        email: user.Email,
        amount: Math.round(totals.totalAmount * 100),
        currency: "ZAR",
        reference,
        callback_url: `${process.env.FRONTEND_URL}/resort/callback`,
        subaccount: developerSubaccount,
        transaction_charge: Math.round(totals.mainAccountChargeAmount * 100),
        bearer: "account",
        metadata: {
          paymentType: "elephant_resort",
          bookingId,
          bookingNumber,
          entryCode,
          userId,
          visitDate,
          adults: safeAdults,
          children: safeChildren,
          infants: safeInfants,
          admissionAmount: totals.admissionAmount,
          serviceFeeAmount: totals.serviceFeeAmount,
          customerProcessingFeeAmount: totals.customerProcessingFeeAmount,
          totalAmount: totals.totalAmount,
          termsVersion: RESORT_TERMS_VERSION
        }
      });

      return res.json({
        authorizationUrl: paystackResponse.data.data.authorization_url,
        reference,
        bookingNumber,
        entryCode,
        ...totals
      });
    } catch (paystackError) {
      const paystackData = paystackError.response?.data;

      console.error(
        "Resort Paystack initialization failed:",
        paystackData || paystackError.message || paystackError
      );

      await sql.query`
        UPDATE ResortBookings
        SET PaymentStatus = 'failed', UpdatedAt = GETDATE()
        WHERE Id = ${bookingId}
        AND PaymentStatus = 'pending'
      `;

      const detail = paystackData?.message || paystackData?.data?.message;

      return res.status(502).json({
        message: detail
          ? `Paystack: ${detail}`
          : "Paystack could not initialize the resort payment."
      });
    }
  } catch (err) {
    console.error("Resort booking initialization error:", err.response?.data || err);
    res.status(500).json({ message: "Unable to start resort booking payment" });
  }
});

/* VERIFY RESORT PAYMENT */
app.get("/resort/bookings/verify/:reference", async (req, res) => {
  const { reference } = req.params;

  try {
    const verifyResponse = await paystack.get(`/transaction/verify/${reference}`);
    const data = verifyResponse.data.data;

    const bookingResult = await sql.query`
      SELECT rb.*, u.Email
      FROM ResortBookings rb
      JOIN Users u ON u.Id = rb.UserId
      WHERE rb.PaystackReference = ${reference}
    `;

    const booking = bookingResult.recordset[0];

    if (!booking) {
      return res.status(404).json({ message: "Resort booking not found" });
    }

    if (!req.user.isAdmin && Number(booking.UserId) !== req.user.id) {
      return res.status(403).json({ message: "You cannot verify another customer's booking" });
    }

    const expectedAmount = Math.round(Number(booking.TotalAmount) * 100);
    const paidAmount = Number(data.amount);
    const paidCurrency = String(data.currency || "").toUpperCase();
    const paymentChannel = String(data.channel || "").toLowerCase();

    if (
      data.status === "success" &&
      paidAmount === expectedAmount &&
      paidCurrency === "ZAR" 
    ) {
      await sql.query`
        UPDATE ResortBookings
        SET PaymentStatus = 'paid',
            BookingStatus = CASE WHEN BookingStatus = 'pending' THEN 'confirmed' ELSE BookingStatus END,
            PaidAt = COALESCE(PaidAt, GETDATE()),
            UpdatedAt = GETDATE()
        WHERE Id = ${booking.Id}
      `;

      await sendResortBookingConfirmation(booking.Id);

      const latest = await sql.query`
        SELECT
          Id,
          BookingNumber,
          EntryCode,
          VisitDate,
          Adults,
          Children,
          Infants,
          AdmissionAmount,
          ServiceFeeAmount,
          CustomerProcessingFeeAmount,
          TotalAmount,
          PaymentStatus,
          BookingStatus
        FROM ResortBookings
        WHERE Id = ${booking.Id}
      `;

      return res.json({
        status: "success",
        message: "Resort booking confirmed",
        booking: latest.recordset[0]
      });
    }

    if (booking.PaymentStatus !== "paid") {
      await sql.query`
        UPDATE ResortBookings
        SET PaymentStatus = 'failed', UpdatedAt = GETDATE()
        WHERE Id = ${booking.Id}
        AND PaymentStatus = 'pending'
      `;
    }

    res.json({
      status: "failed",
      message:
        data.status === "success"
          ? "Payment could not be verified against the resort booking amount."
          : "Payment was not completed"
    });
  } catch (err) {
    console.error("Resort payment verification error:", err.response?.data || err);
    res.status(500).json({ message: "Unable to verify resort payment" });
  }
});

/* CUSTOMER: RESORT BOOKING HISTORY */
app.get("/resort/bookings/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await sql.query`
      SELECT *
      FROM ResortBookings
      WHERE UserId = ${userId}
      ORDER BY VisitDate DESC, CreatedAt DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching resort bookings" });
  }
});

/* ADMIN: GET ALL RESORT BOOKINGS */
app.get("/resort/bookings", async (req, res) => {
  try {
    const result = await sql.query`
      SELECT rb.*, u.Email AS UserEmail
      FROM ResortBookings rb
      JOIN Users u ON u.Id = rb.UserId
      ORDER BY rb.VisitDate DESC, rb.CreatedAt DESC
    `;

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching resort bookings" });
  }
});

/* ADMIN: UPDATE RESORT BOOKING STATUS */
app.put("/resort/bookings/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["confirmed", "checked_in", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid resort booking status" });
  }

  try {
    const existing = await sql.query`
      SELECT *
      FROM ResortBookings
      WHERE Id = ${id}
    `;

    const booking = existing.recordset[0];

    if (!booking) {
      return res.status(404).json({ message: "Resort booking not found" });
    }

    if (booking.PaymentStatus !== "paid") {
      return res.status(400).json({ message: "Only paid resort bookings can be updated" });
    }

    await sql.query`
      UPDATE ResortBookings
      SET BookingStatus = ${status},
          CheckedInAt = ${status === "checked_in" ? new Date() : null},
          UpdatedAt = GETDATE()
      WHERE Id = ${id}
    `;

    res.json({ message: `Resort booking marked as ${status.replace("_", " ")}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating resort booking" });
  }
});



/* ================= DIRECT EVENT TICKETING ================= */

const EVENT_SERVICE_FEE_PERCENT = 5.0;
const EVENT_TICKET_HOLD_MINUTES = 15;
const EVENT_TICKET_TERMS_VERSION = "2026-08-category-ticketing-v4-5pct-developer-split";

function createTicketOrderNumber(){ return `ET-${Date.now()}-${crypto.randomInt(1000,10000)}`; }
function createTicketNumber(eventId){ return `ALT-${eventId}-${Date.now()}-${crypto.randomInt(10000,100000)}`; }
function calculateEventTicketTotals(admissionAmount){
  // Event tickets use an internal 5% developer commission split.
  // The customer does NOT pay the 5% developer commission on top of the advertised ticket price.
  // The customer only covers the Paystack/EFT processing fee.
  admissionAmount=Number(Number(admissionAmount).toFixed(2));

  const serviceFeeAmount=Number(
    (admissionAmount*(EVENT_SERVICE_FEE_PERCENT/100)).toFixed(2)
  );

  const businessShareAmount=Number(
    (admissionAmount-serviceFeeAmount).toFixed(2)
  );

  const effectivePaystackRate=PAYSTACK_EFT_RATE*(1+PAYSTACK_FEE_VAT_RATE);

  // Gross-up the advertised ticket total only, so Paystack's processing fee
  // is covered by the customer without adding the 8% platform share to checkout.
  const customerProcessingFeeAmount=Number(
    ((admissionAmount*effectivePaystackRate)/(1-effectivePaystackRate)).toFixed(2)
  );

  const totalAmount=Number(
    (admissionAmount+customerProcessingFeeAmount).toFixed(2)
  );

  // Production split:
  // - All Liquors is the Paystack MAIN account and receives the 95% ticket share
  //   plus the customer-funded processing allowance.
  // - The developer SUBACCOUNT receives the 5% commission.
  // - The main account bears Paystack's processing fee.
  const mainAccountChargeAmount=Number(
    (businessShareAmount+customerProcessingFeeAmount).toFixed(2)
  );

  return {
    admissionAmount,
    serviceFeeAmount,
    customerProcessingFeeAmount,
    businessShareAmount,
    totalAmount,
    mainAccountChargeAmount
  };
}

async function releaseExpiredEventTicketHolds(){
  const tx=new sql.Transaction(); await tx.begin();
  try{
    const expired=await new sql.Request(tx).query(`SELECT Id FROM EventTicketOrders WITH (UPDLOCK,ROWLOCK) WHERE PaymentStatus='pending' AND HoldStatus='held' AND HoldExpiresAt<=GETDATE()`);
    for(const order of expired.recordset){
      const items=await new sql.Request(tx).input('orderId',sql.Int,order.Id).query(`SELECT TicketTypeId,Quantity FROM EventTicketOrderItems WHERE TicketOrderId=@orderId`);
      for(const item of items.recordset){
        await new sql.Request(tx).input('typeId',sql.Int,item.TicketTypeId).input('qty',sql.Int,item.Quantity).query(`UPDATE EventTicketTypes SET WebsiteTicketsHeld=CASE WHEN WebsiteTicketsHeld>=@qty THEN WebsiteTicketsHeld-@qty ELSE 0 END,UpdatedAt=GETDATE() WHERE Id=@typeId`);
      }
      await new sql.Request(tx).input('id',sql.Int,order.Id).query(`UPDATE EventTicketOrders SET HoldStatus='expired',UpdatedAt=GETDATE() WHERE Id=@id AND HoldStatus='held'`);
    }
    await tx.commit();
  }catch(err){await tx.rollback();throw err;}
}

async function issueEventTickets(orderId){
  const orderResult=await sql.query`SELECT eto.*,e.Title,e.Location,e.EventDate,u.Email FROM EventTicketOrders eto JOIN Events e ON e.Id=eto.EventId JOIN Users u ON u.Id=eto.UserId WHERE eto.Id=${orderId}`;
  const order=orderResult.recordset[0]; if(!order || order.PaymentStatus!=='paid') return [];
  const existing=await sql.query`SELECT * FROM EventTickets WHERE TicketOrderId=${orderId} ORDER BY Id`; if(existing.recordset.length) return existing.recordset;
  const items=await sql.query`SELECT * FROM EventTicketOrderItems WHERE TicketOrderId=${orderId} ORDER BY Id`;
  const created=[];
  for(const item of items.recordset){
    for(let i=0;i<Number(item.Quantity);i++){
      const ticketNumber=createTicketNumber(order.EventId), token=crypto.randomBytes(24).toString('hex');
      const inserted=await sql.query`INSERT INTO EventTickets(TicketOrderId,EventId,UserId,TicketNumber,TicketToken,TicketStatus,TicketTypeId,TicketTypeName) OUTPUT INSERTED.* VALUES(${orderId},${order.EventId},${order.UserId},${ticketNumber},${token},'valid',${item.TicketTypeId},${item.TicketTypeName})`;
      created.push(inserted.recordset[0]);
    }
  }
  return created;
}

async function sendEventTicketConfirmation(orderId){
  const orderResult=await sql.query`SELECT eto.*,e.Title,e.Location,e.EventDate,u.Email FROM EventTicketOrders eto JOIN Events e ON e.Id=eto.EventId JOIN Users u ON u.Id=eto.UserId WHERE eto.Id=${orderId}`;
  const order=orderResult.recordset[0]; if(!order || order.ConfirmationEmailSentAt) return;
  const tickets=await issueEventTickets(orderId); const frontendUrl=process.env.FRONTEND_URL||'http://localhost:5173'; const blocks=[];
  for(const ticket of tickets){
    const verifyUrl=`${frontendUrl}/ticket/${ticket.TicketToken}`; const qr=await QRCode.toDataURL(verifyUrl,{width:220,margin:1});
    blocks.push(`<div style="border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:18px 0;text-align:center"><div style="font-size:12px;color:#b8860b;font-weight:800;letter-spacing:1.4px">DIGITAL TICKET</div><h3 style="margin:8px 0 4px">${order.Title}</h3><p style="margin:4px 0;font-weight:700">${ticket.TicketTypeName||'Admission'}</p><p style="margin:5px 0;color:#6b7280">${ticket.TicketNumber}</p><img src="${qr}" width="190" height="190"/><p style="font-size:12px;color:#6b7280">Present this QR ticket at the entrance. Valid for one entry only.</p></div>`);
  }
  await transporter.sendMail({from:`"All Liquors Wholesale" <${process.env.EMAIL_USER}>`,to:order.Email,subject:`Your digital tickets — ${order.Title}`,html:`<div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;padding:30px;color:#111827"><p style="font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#b8860b">All Liquors Tickets</p><h2>Payment confirmed</h2><p>Your digital tickets are ready. Present each QR code at the gate.</p><p><strong>${order.Title}</strong><br/>${order.Location}<br/>${new Date(order.EventDate).toLocaleString('en-ZA')}</p>${blocks.join('')}<p>Order: <strong>${order.TicketOrderNumber}</strong><br/>Total paid: <strong>R${Number(order.TotalAmount).toFixed(2)}</strong></p></div>`});
  await sql.query`UPDATE EventTicketOrders SET ConfirmationEmailSentAt=GETDATE(),UpdatedAt=GETDATE() WHERE Id=${orderId}`;
}

async function confirmEventTicketPayment(reference,paystackData){
  const orderResult=await sql.query`SELECT * FROM EventTicketOrders WHERE PaystackReference=${reference}`; const order=orderResult.recordset[0]; if(!order) return {ok:false,message:'Ticket order not found'};
  const expected=Math.round(Number(order.TotalAmount)*100), paid=Number(paystackData.amount), currency=String(paystackData.currency||'').toUpperCase(), channel=String(paystackData.channel||'').toLowerCase();
  if(paystackData.status!=='success'||paid!==expected||currency!=='ZAR'||(channel&&channel!=='eft')) return {ok:false,message:'Payment details could not be verified'};
  if(order.PaymentStatus==='paid'){await issueEventTickets(order.Id);return {ok:true,orderId:order.Id};}
  const tx=new sql.Transaction(); await tx.begin();
  try{
    const locked=(await new sql.Request(tx).input('id',sql.Int,order.Id).query(`SELECT * FROM EventTicketOrders WITH(UPDLOCK,ROWLOCK) WHERE Id=@id`)).recordset[0];
    const items=(await new sql.Request(tx).input('orderId',sql.Int,order.Id).query(`SELECT * FROM EventTicketOrderItems WHERE TicketOrderId=@orderId`)).recordset;
    if(locked.PaymentStatus!=='paid'){
      for(const item of items){
        const req=new sql.Request(tx).input('typeId',sql.Int,item.TicketTypeId).input('qty',sql.Int,item.Quantity);
        const inv=locked.HoldStatus==='held'
          ? await req.query(`UPDATE EventTicketTypes SET WebsiteTicketsHeld=CASE WHEN WebsiteTicketsHeld>=@qty THEN WebsiteTicketsHeld-@qty ELSE 0 END,WebsiteTicketsSold=WebsiteTicketsSold+@qty,UpdatedAt=GETDATE() WHERE Id=@typeId AND WebsiteTicketsSold+@qty<=WebsiteTicketLimit`)
          : await req.query(`UPDATE EventTicketTypes SET WebsiteTicketsSold=WebsiteTicketsSold+@qty,UpdatedAt=GETDATE() WHERE Id=@typeId AND WebsiteTicketsSold+WebsiteTicketsHeld+@qty<=WebsiteTicketLimit`);
        if(!inv.rowsAffected[0]) throw new Error(`Ticket allocation is no longer available for ${item.TicketTypeName}`);
      }
      await new sql.Request(tx).input('id',sql.Int,locked.Id).query(`UPDATE EventTicketOrders SET PaymentStatus='paid',HoldStatus='converted',PaidAt=COALESCE(PaidAt,GETDATE()),UpdatedAt=GETDATE() WHERE Id=@id`);
    }
    await tx.commit();
  }catch(err){await tx.rollback();throw err;}
  await issueEventTickets(order.Id); await sendEventTicketConfirmation(order.Id); return {ok:true,orderId:order.Id};
}

app.get('/events/:id/ticket-availability',async(req,res)=>{
  try{
    await releaseExpiredEventTicketHolds();
    const event=(await sql.query`SELECT Id,Title,Location,EventDate,Description,Image,DirectTicketingEnabled FROM Events WHERE Id=${req.params.id}`).recordset[0];
    if(!event) return res.status(404).json({message:'Event not found'});
    const types=await sql.query`SELECT Id,Name,Price,Description,WebsiteTicketLimit,WebsiteTicketsSold,WebsiteTicketsHeld,CASE WHEN WebsiteTicketLimit-WebsiteTicketsSold-WebsiteTicketsHeld<0 THEN 0 ELSE WebsiteTicketLimit-WebsiteTicketsSold-WebsiteTicketsHeld END AS Available FROM EventTicketTypes WHERE EventId=${req.params.id} AND IsActive=1 ORDER BY SortOrder,Id`;
    res.json({...event,ticketTypes:types.recordset,Available:types.recordset.reduce((s,t)=>s+Number(t.Available||0),0)});
  }catch(err){console.error(err);res.status(500).json({message:'Unable to load ticket availability'});}
});

app.post('/tickets/initialize',ticketPurchaseRateLimit,async(req,res)=>{
  const {userId,eventId,items,termsAccepted}=req.body;
  if(!userId||!eventId||!Array.isArray(items)||!items.length) return res.status(400).json({message:'Choose at least one ticket'});
  if(!termsAccepted) return res.status(400).json({message:'You must agree to the ticket Terms & Conditions'});
  const cleaned=items.map(i=>({ticketTypeId:Number(i.ticketTypeId),quantity:Number(i.quantity)})).filter(i=>Number.isInteger(i.ticketTypeId)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=10);
  if(!cleaned.length||cleaned.length!==items.length||cleaned.reduce((s,i)=>s+i.quantity,0)>10) return res.status(400).json({message:'You can buy up to 10 tickets per checkout'});
  const secretKey=process.env.PAYSTACK_SECRET_KEY?.trim(), developerSubaccount=process.env.PAYSTACK_DEV_SUBACCOUNT?.trim();
  if(!secretKey||!developerSubaccount) return res.status(500).json({message:'Paystack ticket payment is not configured'});
  try{
    await releaseExpiredEventTicketHolds();
    const user=(await sql.query`SELECT Id,Email FROM Users WHERE Id=${userId} AND ISNULL(IsDeleted,0)=0`).recordset[0]; if(!user) return res.status(404).json({message:'User not found'});
    const event=(await sql.query`SELECT * FROM Events WHERE Id=${eventId}`).recordset[0]; if(!event) return res.status(404).json({message:'Event not found'}); if(!event.DirectTicketingEnabled) return res.status(400).json({message:'Online ticket sales are not enabled'}); if(new Date(event.EventDate)<=new Date()) return res.status(400).json({message:'Ticket sales for this event have closed'});
    const ids=cleaned.map(i=>i.ticketTypeId); const placeholders=ids.map((_,i)=>`@id${i}`).join(','); const typeReq=new sql.Request(); ids.forEach((v,i)=>typeReq.input(`id${i}`,sql.Int,v)); typeReq.input('eventId',sql.Int,Number(eventId));
    const typeRows=(await typeReq.query(`SELECT * FROM EventTicketTypes WHERE EventId=@eventId AND IsActive=1 AND Id IN (${placeholders})`)).recordset;
    if(typeRows.length!==cleaned.length) return res.status(400).json({message:'One or more ticket categories are invalid'});
    const byId=new Map(typeRows.map(t=>[Number(t.Id),t]));
    const admission=cleaned.reduce((sum,i)=>sum+Number(byId.get(i.ticketTypeId).Price)*i.quantity,0); const totals=calculateEventTicketTotals(admission);
    const tx=new sql.Transaction(); await tx.begin(); let orderId,orderNumber;
    try{
      for(const item of cleaned){
        const type=byId.get(item.ticketTypeId);
        const hold=await new sql.Request(tx).input('typeId',sql.Int,item.ticketTypeId).input('qty',sql.Int,item.quantity).query(`UPDATE EventTicketTypes SET WebsiteTicketsHeld=WebsiteTicketsHeld+@qty,UpdatedAt=GETDATE() WHERE Id=@typeId AND WebsiteTicketsSold+WebsiteTicketsHeld+@qty<=WebsiteTicketLimit`);
        if(!hold.rowsAffected[0]){await tx.rollback();return res.status(409).json({message:`Not enough ${type.Name} tickets remain`});}
      }
      orderNumber=createTicketOrderNumber(); const qty=cleaned.reduce((s,i)=>s+i.quantity,0); const first=byId.get(cleaned[0].ticketTypeId);
      const insert=await new sql.Request(tx).input('eventId',sql.Int,Number(eventId)).input('userId',sql.Int,Number(userId)).input('orderNumber',sql.NVarChar(60),orderNumber).input('quantity',sql.Int,qty).input('unitPrice',sql.Decimal(10,2),Number(first.Price)).input('admission',sql.Decimal(10,2),totals.admissionAmount).input('service',sql.Decimal(10,2),totals.serviceFeeAmount).input('processing',sql.Decimal(10,2),totals.customerProcessingFeeAmount).input('business',sql.Decimal(10,2),totals.businessShareAmount).input('total',sql.Decimal(10,2),totals.totalAmount).input('percent',sql.Decimal(5,2),EVENT_SERVICE_FEE_PERCENT).input('termsAt',sql.DateTime2,new Date()).input('termsVersion',sql.NVarChar(60),EVENT_TICKET_TERMS_VERSION).query(`INSERT INTO EventTicketOrders(EventId,UserId,TicketOrderNumber,Quantity,UnitPrice,AdmissionAmount,ServiceFeeAmount,CustomerProcessingFeeAmount,BusinessShareAmount,TotalAmount,ServiceFeePercent,PaymentStatus,HoldStatus,HoldExpiresAt,TermsAcceptedAt,TermsVersion) OUTPUT INSERTED.Id VALUES(@eventId,@userId,@orderNumber,@quantity,@unitPrice,@admission,@service,@processing,@business,@total,@percent,'pending','held',DATEADD(MINUTE,${EVENT_TICKET_HOLD_MINUTES},GETDATE()),@termsAt,@termsVersion)`);
      orderId=insert.recordset[0].Id;
      for(const item of cleaned){const type=byId.get(item.ticketTypeId);await new sql.Request(tx).input('orderId',sql.Int,orderId).input('typeId',sql.Int,type.Id).input('name',sql.NVarChar(120),type.Name).input('price',sql.Decimal(10,2),Number(type.Price)).input('qty',sql.Int,item.quantity).input('line',sql.Decimal(10,2),Number((Number(type.Price)*item.quantity).toFixed(2))).query(`INSERT INTO EventTicketOrderItems(TicketOrderId,TicketTypeId,TicketTypeName,UnitPrice,Quantity,LineTotal) VALUES(@orderId,@typeId,@name,@price,@qty,@line)`);}
      await tx.commit();
    }catch(err){if(tx._aborted!==true) await tx.rollback();throw err;}
    const reference=`${orderNumber}-${Date.now()}`; await sql.query`UPDATE EventTicketOrders SET PaystackReference=${reference},UpdatedAt=GETDATE() WHERE Id=${orderId}`;
    try{
      const response=await paystack.post('/transaction/initialize',{email:user.Email,amount:Math.round(totals.totalAmount*100),currency:'ZAR',
        reference,callback_url:`${process.env.FRONTEND_URL}/tickets/callback`,subaccount:developerSubaccount,transaction_charge:Math.round(totals.mainAccountChargeAmount*100),bearer:'account',metadata:{paymentType:'event_ticket',eventId:Number(eventId),ticketOrderId:orderId,orderNumber,userId:Number(userId),items:cleaned,totalAmount:totals.totalAmount}});
      return res.json({authorizationUrl:response.data.data.authorization_url,reference,orderNumber,holdMinutes:EVENT_TICKET_HOLD_MINUTES,...totals});
    }catch(paystackError){
      const failTx=new sql.Transaction();await failTx.begin();try{for(const item of cleaned){await new sql.Request(failTx).input('typeId',sql.Int,item.ticketTypeId).input('qty',sql.Int,item.quantity).query(`UPDATE EventTicketTypes SET WebsiteTicketsHeld=CASE WHEN WebsiteTicketsHeld>=@qty THEN WebsiteTicketsHeld-@qty ELSE 0 END WHERE Id=@typeId`);}await new sql.Request(failTx).input('orderId',sql.Int,orderId).query(`UPDATE EventTicketOrders SET PaymentStatus='failed',HoldStatus='released',UpdatedAt=GETDATE() WHERE Id=@orderId AND PaymentStatus='pending'`);await failTx.commit();}catch(e){await failTx.rollback();}
      return res.status(502).json({message:paystackError.response?.data?.message||'Paystack could not initialize ticket payment'});
    }
  }catch(err){console.error('Ticket initialization error:',err);res.status(500).json({message:err.message||'Unable to start ticket checkout'});}
});

app.get('/tickets/verify-payment/:reference', async (req, res) => {
  try {
    const ownerResult = await sql.query`SELECT UserId FROM EventTicketOrders WHERE PaystackReference=${req.params.reference}`;
    const owner = ownerResult.recordset[0];
    if (!owner) return res.status(404).json({ message: 'Ticket order not found' });
    if (!req.user.isAdmin && Number(owner.UserId) !== req.user.id) {
      return res.status(403).json({ message: "You cannot verify another customer's ticket order" });
    }

    const verify = await paystack.get(`/transaction/verify/${req.params.reference}`);
    const result = await confirmEventTicketPayment(req.params.reference, verify.data.data);
    if (!result.ok) return res.status(400).json({ status: 'failed', message: result.message });
    const order = await sql.query`SELECT eto.*,e.Title,e.Location,e.EventDate FROM EventTicketOrders eto JOIN Events e ON e.Id=eto.EventId WHERE eto.Id=${result.orderId}`;
    const tickets = await sql.query`SELECT * FROM EventTickets WHERE TicketOrderId=${result.orderId} ORDER BY Id`;
    res.json({ status: 'success', order: order.recordset[0], tickets: tickets.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Unable to verify ticket payment' });
  }
});

app.get('/tickets/user/:userId',async(req,res)=>{try{const result=await sql.query`SELECT t.*,e.Title,e.Location,e.EventDate,e.Image,eto.TicketOrderNumber,eto.TotalAmount,eto.PaidAt FROM EventTickets t JOIN Events e ON e.Id=t.EventId JOIN EventTicketOrders eto ON eto.Id=t.TicketOrderId WHERE t.UserId=${req.params.userId} ORDER BY e.EventDate DESC,t.Id DESC`;res.json(result.recordset);}catch(err){console.error(err);res.status(500).json({message:'Unable to load tickets'});}});
app.get('/tickets/token/:token/qr',async(req,res)=>{try{const exists=await sql.query`SELECT Id FROM EventTickets WHERE TicketToken=${req.params.token}`;if(!exists.recordset[0])return res.status(404).send('Ticket not found');const frontendUrl=process.env.FRONTEND_URL||'http://localhost:5173';const png=await QRCode.toBuffer(`${frontendUrl}/ticket/${req.params.token}`,{type:'png',width:320,margin:1});res.type('png').send(png);}catch(err){res.status(500).send('Unable to generate QR code');}});
app.get('/tickets/token/:token',async(req,res)=>{try{const result=await sql.query`SELECT t.Id,t.TicketNumber,t.TicketStatus,t.CheckedInAt,t.TicketTypeName,e.Title,e.Location,e.EventDate,e.Image FROM EventTickets t JOIN Events e ON e.Id=t.EventId WHERE t.TicketToken=${req.params.token}`;if(!result.recordset[0])return res.status(404).json({message:'Ticket not found'});res.json(result.recordset[0]);}catch(err){res.status(500).json({message:'Unable to verify ticket'});}});
app.post('/tickets/token/:token/check-in',async(req,res)=>{const{adminUserId}=req.body;try{const admin=await sql.query`SELECT Id FROM Users WHERE Id=${adminUserId} AND IsAdmin=1 AND ISNULL(IsDeleted,0)=0`;if(!admin.recordset[0])return res.status(403).json({message:'Admin access required'});const result=await sql.query`UPDATE EventTickets SET TicketStatus='used',CheckedInAt=GETDATE(),UpdatedAt=GETDATE() OUTPUT INSERTED.* WHERE TicketToken=${req.params.token} AND TicketStatus='valid'`;if(!result.recordset[0]){const existing=await sql.query`SELECT TicketStatus,CheckedInAt FROM EventTickets WHERE TicketToken=${req.params.token}`;if(!existing.recordset[0])return res.status(404).json({message:'Ticket not found'});return res.status(409).json({message:existing.recordset[0].TicketStatus==='used'?'Ticket has already been used':'Ticket is not valid',ticket:existing.recordset[0]});}res.json({message:'Ticket checked in successfully',ticket:result.recordset[0]});}catch(err){res.status(500).json({message:'Unable to check in ticket'});}});

app.get('/admin/ticket-sales', async (req, res) => {
  try {
    await releaseExpiredEventTicketHolds();

    // Only active events appear in live monitoring. Historical payment/ticket
    // records remain in SQL Server for audit purposes after an event is archived.
    const events = (await sql.query`
      SELECT Id, Title, EventDate
      FROM Events
      WHERE ISNULL(IsDeleted, 0) = 0
      ORDER BY EventDate DESC
    `).recordset;

    for (const event of events) {
      event.ticketTypes = (await sql.query`
        SELECT
          Id, Name, Price, WebsiteTicketLimit, WebsiteTicketsSold, WebsiteTicketsHeld,
          CASE
            WHEN WebsiteTicketLimit - WebsiteTicketsSold - WebsiteTicketsHeld < 0 THEN 0
            ELSE WebsiteTicketLimit - WebsiteTicketsSold - WebsiteTicketsHeld
          END AS Available
        FROM EventTicketTypes
        WHERE EventId = ${event.Id}
          AND IsActive = 1
        ORDER BY SortOrder, Id
      `).recordset;
    }

    const recent = await sql.query`
      SELECT TOP 500 eto.*, e.Title, u.Email
      FROM EventTicketOrders eto
      JOIN Events e ON e.Id = eto.EventId
      JOIN Users u ON u.Id = eto.UserId
      WHERE ISNULL(e.IsDeleted, 0) = 0
      ORDER BY eto.CreatedAt DESC
    `;

    const tickets = await sql.query`
      SELECT TOP 1000
        t.Id,
        t.TicketNumber,
        t.TicketToken,
        t.TicketStatus,
        t.CheckedInAt,
        t.CreatedAt,
        t.TicketTypeName,
        e.Id AS EventId,
        e.Title,
        e.EventDate,
        u.Email
      FROM EventTickets t
      JOIN Events e ON e.Id = t.EventId
      JOIN Users u ON u.Id = t.UserId
      WHERE ISNULL(e.IsDeleted, 0) = 0
      ORDER BY t.CreatedAt DESC
    `;

    res.json({
      events,
      orders: recent.recordset,
      tickets: tickets.recordset
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to load ticket sales' });
  }
});

/* ================= FAVORITES ================= */

/* GET USER'S FAVORITES */
app.get("/favorites/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await sql.query`
      SELECT f.Id AS FavoriteId, p.*
      FROM Favorites f
      JOIN Products p ON p.Id = f.ProductId
      WHERE f.UserId = ${userId}
      ORDER BY f.CreatedAt DESC
    `;

    res.json(result.recordset);

  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching favorites ❌");
  }
});

/* ADD FAVORITE */
app.post("/favorites", async (req, res) => {
  const { userId, productId } = req.body;

  if (!userId || !productId) {
    return res.status(400).json({ message: "userId and productId are required ❌" });
  }

  try {
    const existing = await sql.query`
      SELECT Id FROM Favorites WHERE UserId = ${userId} AND ProductId = ${productId}
    `;

    if (existing.recordset.length > 0) {
      return res.json({ message: "Already in favorites", favorited: true });
    }

    await sql.query`
      INSERT INTO Favorites (UserId, ProductId)
      VALUES (${userId}, ${productId})
    `;

    res.json({ message: "Added to favorites ✅", favorited: true });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error adding favorite ❌" });
  }
});

/* REMOVE FAVORITE */
app.delete("/favorites/:userId/:productId", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    await sql.query`
      DELETE FROM Favorites WHERE UserId = ${userId} AND ProductId = ${productId}
    `;

    res.json({ message: "Removed from favorites ✅", favorited: false });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error removing favorite ❌" });
  }
});

const PORT = Number(process.env.PORT || 3000);
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 30_000;

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});