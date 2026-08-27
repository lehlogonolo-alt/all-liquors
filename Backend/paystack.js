const axios = require("axios");

// All requests to Paystack go through this instance,
// authenticated with your secret key from .env
const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json"
  }
});

module.exports = paystack;
