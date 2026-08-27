const sql = require("mssql");

const isProduction = process.env.NODE_ENV === "production";

const config = {
  user: process.env.DB_USER || "liquorsUser",

  password: process.env.DB_PASSWORD || "Password123!",

  server:
    process.env.DB_SERVER ||
    "SJR\\SQLEXPRESS",

  database:
    process.env.DB_NAME ||
    "AllLiquorsDB",

  port: Number(
    process.env.DB_PORT || 1433
  ),

  pool: {
    max: Number(
      process.env.DB_POOL_MAX || 30
    ),

    min: Number(
      process.env.DB_POOL_MIN || 2
    ),

    idleTimeoutMillis: Number(
      process.env.DB_IDLE_TIMEOUT_MS || 30000
    )
  },

  connectionTimeout: Number(
    process.env.DB_CONNECTION_TIMEOUT_MS || 30000
  ),

  requestTimeout: Number(
    process.env.DB_REQUEST_TIMEOUT_MS || 30000
  ),

  options: {
    encrypt:
      String(
        process.env.DB_ENCRYPT ?? isProduction
      ).toLowerCase() === "true",

    trustServerCertificate:
      String(
        process.env.DB_TRUST_SERVER_CERTIFICATE ??
        !isProduction
      ).toLowerCase() === "true",

    enableArithAbort: true
  }
};


/* =============================
   PRODUCTION VALIDATION
============================= */

if (isProduction) {
  const required = [
    "DB_SERVER",
    "DB_NAME",
    "DB_USER",
    "DB_PASSWORD"
  ];

  const missing = required.filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing production database variables: ${missing.join(", ")}`
    );
  }
}


/* =============================
   CONNECT TO SQL SERVER
============================= */

sql.connect(config)
  .then(() => {
    console.log(
      `Connected to SQL Server ✅ (${config.server}/${config.database})`
    );
  })
  .catch((err) => {
    console.error(
      "DB Connection Error:",
      err.message
    );

    if (isProduction) {
      process.exit(1);
    }
  });

module.exports = sql;
