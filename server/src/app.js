import express from "express";
import cors from "cors";
import multer from "multer";
import { config } from "./config.js";
import { ApiError } from "./strapi.js";
import authRouter, { usersRouter } from "./routes/auth.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";
import uploadRouter from "./routes/upload.js";
import uploadsRouter from "./routes/uploads.js";

export function createApp() {
  const app = express();

  // Strapi's query syntax is nested (`pagination[page]=2`), and Express 5
  // defaults to the flat "simple" parser, which would leave the brackets in the
  // key name.
  app.set("query parser", "extended");
  app.disable("x-powered-by");

  app.use(
    cors({
      origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      maxAge: 86400,
    })
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/uploads", uploadsRouter);

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/upload", uploadRouter);

  app.use((req, _res, next) => {
    next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
}

// eslint-disable-next-line max-params -- Express identifies error handlers by arity.
function errorHandler(error, _req, res, _next) {
  const apiError = toApiError(error);

  if (apiError.status >= 500) {
    console.error("[error]", error);
  }

  res.status(apiError.status).json(apiError.toBody());
}

function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `File is larger than the ${Math.round(
            config.maxUploadBytes / 1024 / 1024
          )}MB limit`
        : error.message;

    return ApiError.badRequest(message, { code: error.code });
  }

  // Thrown by express.json() on malformed request bodies.
  if (error?.type === "entity.parse.failed") {
    return ApiError.badRequest("Request body is not valid JSON");
  }

  if (error?.message?.startsWith("Not allowed by CORS")) {
    return ApiError.forbidden(error.message);
  }

  return new ApiError(
    500,
    "InternalServerError",
    config.isProduction ? "Internal Server Error" : String(error?.message || error)
  );
}
