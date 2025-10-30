import { Telegraf } from "telegraf";

const startBot = async (bot: Telegraf<any>) => {
  try {
    bot.launch();
    const info = await bot.telegram.getMe();
    console.log(`✅ Bot @${info.username} started!`);
  } catch (err) {
    console.error("❌ Botni ishga tushirishda xatolik:", err);
  }
};

export default startBot;
