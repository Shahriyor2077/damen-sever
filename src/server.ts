import "reflect-metadata";
import app from "./app";
import connectDB from "./config/db";
import createSuperAdmin from "./utils/createSuperAdmin";
import seedRoles from "./utils/createRole";
import startBot from "./bot/startBot";
import bot from "./bot/main";
import createCurrencyCourse from "./utils/createCurrencyCourse";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await seedRoles();
    await createCurrencyCourse();
    await createSuperAdmin();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Dastur xotira iste'moli: ${Math.round(used * 100) / 100} MB`);
  } catch (error) {
    console.error("Server start error:", error);
  }
};

const startApplication = async () => {
  try {
    // Always start the server
    await startServer();

    // Start bot based on environment and configuration
    const enableBot = process.env.ENABLE_BOT;
    const isProduction = process.env.NODE_ENV === "production";
    const hasToken = !!process.env.BOT_TOKEN;

    console.log(`🔍 Bot configuration check:`);
    console.log(`   - Has token: ${hasToken}`);
    console.log(`   - Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`   - ENABLE_BOT: ${enableBot || "not set"}`);

    // Bot startup logic:
    // 1. If ENABLE_BOT is explicitly set to "false", don't start bot
    // 2. If token exists, start bot by default (unless disabled)
    const shouldStartBot = hasToken && enableBot !== "false";

    if (shouldStartBot) {
      console.log("🤖 Starting Telegram bot...");
      try {
        await startBot(bot);
      } catch (botError) {
        console.error("🚫 Bot startup failed, but server continues:", botError);
      }
    } else if (hasToken && enableBot === "false") {
      console.log("🚫 Bot disabled by ENABLE_BOT=false");
    } else {
      console.log("⚠️ Bot token not found, skipping bot initialization");
    }
  } catch (err) {
    console.error("Application start error:", err);
    process.exit(1);
  }
};

startApplication();
