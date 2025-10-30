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

startServer();

// Promise.all([startServer(), startBot(bot)]).catch((err) => {
//   console.error("Dasturni ishga tushirishda xatolik:", err);
//   process.exit(1);
// });
