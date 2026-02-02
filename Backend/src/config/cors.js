const cors = require("cors");
require("dotenv").config();
console.log(process.env.ORIGIN_URL);
module.exports = cors({
  origin: [process.env.ORIGIN_URL],
  credentials: false,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
});
