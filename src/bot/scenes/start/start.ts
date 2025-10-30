import { Markup, Scenes } from "telegraf";
// import axiosInstance from "../../../service/server/api";
import config from "../../utils/config";
import Employee from "../../../schemas/employee.schema";
import { MyContext } from "../../utils/context";

const startScene = new Scenes.BaseScene<MyContext>("start");

startScene.enter(async (ctx) => {
  try {
    if (!ctx.from) {
      console.log("ctx.from mavjud emas");
      return;
    }
    const telegramId = ctx.from.id;

    // const res = await axiosInstance.post("/user/check", { telegramId });

    const employee = await Employee.findOne({
      telegramId: telegramId,
      isActive: true,
      isDeleted: false,
    });
    if (!employee) {
      return await ctx.scene.enter("phone");
    }

    await ctx.reply("✅ Tizimga muvaffaqiyatli kirdingiz.");
  } catch (e) {
    console.log("start/index.ts ERROR:", e);
    await ctx.reply("Ishlashda xatolik yuz berdi.");
  }
});

export default startScene;
