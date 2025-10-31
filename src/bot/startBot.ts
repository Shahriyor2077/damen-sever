import { Telegraf } from "telegraf";

const startBot = async (bot: Telegraf<any>) => {
  console.log("🚀 Bot ishga tushirilmoqda...");

  // Launch bot in background to not block server startup
  setImmediate(async () => {
    try {
      await bot.launch();
      console.log("✅ Bot muvaffaqiyatli ishga tushdi");

      // Get bot info
      try {
        const info = await bot.telegram.getMe();
        console.log(`🤖 Bot tayyor: @${info.username}`);
      } catch (infoErr) {
        console.log("📡 Bot ishlaydi (ma'lumot olishda xatolik)");
      }
    } catch (err: any) {
      console.log("⚠️ Bot ishga tushirishda muammo:", err.message);
      console.log("💡 Server bot muammosisiz ishlaydi");
    }
  });

  // Return immediately to not block server
  console.log("📡 Bot background'da ishga tushirilmoqda...");
};

export default startBot;
