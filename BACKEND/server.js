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
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without an Origin header
      // (Postman, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Allow configured origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      /**
       * Allow Vercel preview deployments.
       *
       * Example:
       * https://ai-evuation-p4v30inxt-vinayakpandey2027-3596s-projects.vercel.app
       */
      if (
        /^https:\/\/ai-evuation-[a-z0-9-]+-vinayakpandey2027-3596s-projects\.vercel\.app$/.test(
          origin
        )
      ) {
        return callback(null, true);
      }

      console.error("❌ CORS blocked origin:", origin);

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,
  })
);

/**
 * =========================================================
 * MIDDLEWARE
 * =========================================================
 */

app.use(express.json());

app.use(cookieParser());

/**
 * =========================================================
 * SESSION
 * =========================================================
 */

app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
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
    console.error("MongoDB Error:", err);
  });

/**
 * =========================================================
 * API ROUTES
 * =========================================================
 */

app.use("/api/evaluations", evaluationRoutes);

app.use("/api/data", marksRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/ppt", pptRoutes);

app.use("/api/ai", aiRoutes);

/**
 * =========================================================
 * ROOT / UNKNOWN ROUTES
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