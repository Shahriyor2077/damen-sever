import { Telegraf } from "telegraf";

const startBot = async (bot: Telegraf<any>) => {
  console.log("🚀 Bot ishga tushirilmoqda...");

  try {
    // Simple launch without getMe check to avoid network timeout
    await bot.launch({
      dropPendingUpdates: true,
    });
    console.log("✅ Bot polling rejimida ishga tushdi");

    // Try to get bot info in background (non-blocking)
    setImmediate(async () => {
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          const info = await Promise.race([
            bot.telegram.getMe(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout")), 10000)
            ),
          ]);
          console.log(`✅ Bot ma'lumoti olindi: @${(info as any).username}`);
          break;
        } catch (infoErr: any) {
          attempts++;
          if (attempts >= maxAttempts) {
            console.log(
              "⚠️ Bot ma'lumotini olishda doimiy xatolik, lekin bot ishlaydi"
            );
            console.log("📡 Bot polling rejimida davom etmoqda...");
            break;
          }
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    });
  } catch (err: any) {
    console.error("❌ Botni ishga tushirishda xatolik:", err.message || err);
    console.log(
      "🔄 Bot ishga tushirishda muammo, lekin server davom etmoqda..."
    );
  }
};

export default startBot;
