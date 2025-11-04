import express, { NextFunction, Request, Response } from "express";
import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./dashboard/routes/index";
import routesSeller from "./seller/routes/index";
import routesBot from "./bot/routes/index";
import path from "path";

import uploadsCsv from "./updatesData/routes/index";

//middleware
import ErrorMiddleware from "./middlewares/error.middleware";

const app = express();
const BotHostUrl = process.env.BOT_HOST_URL;
const dashbordHostUrl = process.env.DASHBOARD_HOST_URL;
const botWebAppUrl = process.env.BOT_WEB_APP_URL;

if (!dashbordHostUrl || !BotHostUrl) {
  throw new Error(
    "DASHBOARD_HOST_URL or BOT_HOST_URL is not defined in environment variables"
  );
}

const allowedOrigins = [
  dashbordHostUrl,
  BotHostUrl,
  "https://www.damen.uz",
  "http://localhost:5174",
  "http://localhost:5173",
];

if (botWebAppUrl) {
  allowedOrigins.push(botWebAppUrl);
}

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/upl", uploadsCsv);
app.use("/api", routes);
app.use("/api/seller", routesSeller);
app.use("/api/bot", routesBot);
app.get("/", (req, res) => {
  res.json({ test: "nasiya server" });
});
//middleware
// app.use(ErrorMiddleware);
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  ErrorMiddleware(err, req, res, next);
});

app.set("trust proxy", 1);

export default app;
