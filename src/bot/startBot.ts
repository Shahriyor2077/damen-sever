import { Telegraf } from "telegraf";

const startBot = async (bot: Telegraf<any>) => {
  try {
    console.log("🚀 Bot ishga tushirilmoqda...");

    // Launch bot with error handling
    await bot.launch();
    console.log("✅ Bot polling rejimida ishga tushdi");

    // Try to get bot info with longer timeout for production
    setTimeout(async () => {
      try {
        const info = await bot.telegram.getMe();
        console.log(`✅ Bot ma'lumoti olindi: @${info.username}`);
      } catch (infoErr) {
        console.log("⚠️ Bot ma'lumotini olishda xatolik, lekin bot ishlaydi");
        console.log("📡 Bot polling rejimida davom etmoqda...");
      }
    }, 2000); // 2 soniya kutib, keyin ma'lumot olishga harakat qilish
  } catch (err) {
    console.error("❌ Botni ishga tushirishda xatolik:", err);
    console.log(
      "🔄 Bot ishga tushirishda muammo, lekin server davom etmoqda..."
    );
  }
};

export default startBot;
