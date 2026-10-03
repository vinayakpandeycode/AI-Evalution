require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cookieParser = require("cookie-parser");

require("./utils/passport");

const evaluationRoutes = require("./routes/EvaluationRoute");
const marksRoutes = require("./routes/MarksRoute");
const authRoutes = require("./routes/authRoutes");
const pptRoutes = require("./routes/pptRoutes");
const aiRoutes = require("./routes/AIRoute");

const app = express();

/**
 * =========================================================
 * CORS CONFIGURATION
 * =========================================================
 */

const allowedOrigins = [
  process.env.CLIENT_URL,

  // Local development
  "http://localhost:5173",
  "http://localhost:3000",

  // Production frontend
  "https://ai-evalution-jade.vercel.app",

  // Current Vercel frontend deployment
  "https://ai-evalution-qhwf.vercel.app",
].filter(Boolean);

console.log("🌐 Allowed CORS origins:");
console.log(allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // Requests without Origin
      // Example: Postman / server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        console.log("✅ CORS allowed:", origin);
        return callback(null, true);
      }

      console.error("❌ CORS blocked origin:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],

    optionsSuccessStatus: 204,
  })
);

/**
 * =========================================================
 * BODY PARSING
 * =========================================================
 */

app.use(express.json());

/**
 * =========================================================
 * COOKIE PARSER
 * =========================================================
 */

app.use(cookieParser());

/**
 * =========================================================
 * SESSION
 * =========================================================
 */

app.use(
  session({
    secret:
      process.env.JWT_SECRET ||
      "temporary-development-secret",

    resave: false,

    saveUninitialized: false,

    cookie: {
      secure:
        process.env.NODE_ENV === "production",

      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",

      httpOnly: true,
    },
  })
);

/**
 * =========================================================
 * PASSPORT
 * =========================================================
 */

app.use(passport.initialize());

app.use(passport.session());

/**
 * =========================================================
 * MONGODB
 * =========================================================
 */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error(
      "MongoDB Error:",
      err
    );
  });

/**
 * =========================================================
 * API ROUTES
 * =========================================================
 */

app.use(
  "/api/evaluations",
  evaluationRoutes
);

app.use(
  "/api/data",
  marksRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/ppt",
  pptRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

/**
 * =========================================================
 * HEALTH CHECK
 * =========================================================
 */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "AI-EvaluAIte backend is running",
  });
});

/**
 * =========================================================
 * ROOT ROUTE
 * =========================================================
 */

app.get("/", (req, res) => {
  res.status(200).json({
    message: "AI-EvaluAIte backend is running",
  });
});

/**
 * =========================================================
 * 404 ROUTE
 * =========================================================
 */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/**
 * =========================================================
 * LOCAL SERVER
 * =========================================================
 */

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(
      `Server running at http://localhost:${PORT}`
    );
  });
}

/**
 * =========================================================
 * VERCEL EXPORT
 * =========================================================
 */

module.exports = app;

/**
 * =========================================================
 * ERROR HANDLERS
 * =========================================================
 */

process.on(
  "unhandledRejection",
  (reason, promise) => {
    console.error(
      "Unhandled Rejection:",
      reason
    );
  }
);

process.on(
  "uncaughtException",
  (err) => {
    console.error(
      "Uncaught Exception:",
      err
    );
  }
);
