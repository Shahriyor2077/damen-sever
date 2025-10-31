import { Telegraf } from "telegraf";

const startBot = async (bot: Telegraf<any>) => {
  try {
    console.log("🚀 Bot ishga tushirilmoqda...");

    // Simple launch without complex configuration
    bot.launch();
    console.log("✅ Bot polling rejimida ishga tushdi");

    // Try to get bot info with timeout
    try {
      const info = await Promise.race([
        bot.telegram.getMe(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), 5000)
        ),
      ]);
      console.log(`✅ Bot ma'lumoti olindi: @${(info as any).username}`);
    } catch (infoErr) {
      console.log("⚠️ Bot ma'lumotini olishda xatolik, lekin bot ishlaydi");
    }
  } catch (err) {
    console.error("❌ Botni ishga tushirishda xatolik:", err);
  }
};

export default startBot;
