import { Markup, Scenes } from "telegraf";
import Employee from "../../../schemas/employee.schema";
import { MyContext } from "../../utils/context";

const phoneScene = new Scenes.BaseScene<MyContext>("phone");

phoneScene.enter(async (ctx) => {
  try {
    await ctx.reply(
      "Telefon raqamingizni kiriting: ",
      Markup.keyboard([
        Markup.button.contactRequest("📱 Telefon raqamni yuborish"),
      ])
        .resize()
        .oneTime()
    );
  } catch (err: any) {
    console.log("Phone scene enter error:", err.message);
  }
});

phoneScene.hears(/^\/start\b/, (ctx) => ctx.scene.enter("start"));

phoneScene.on("contact", async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    let phoneNumber = ctx.message?.contact.phone_number;

    if (!phoneNumber.startsWith("+")) {
      phoneNumber = "+" + phoneNumber;
    }

    console.log("phoneNumber", phoneNumber);

    const employee = await Employee.findOne({
      phoneNumber: phoneNumber,
      isActive: true,
      isDeleted: false,
    });
    if (employee) {
      employee.telegramId = telegramId.toString();
      await employee.save();

      await ctx.reply(
        `${employee.firstName} ${employee.lastName}, shaxsingiz tasdiqlandi.`
      );

      return await ctx.scene.enter("start");
    } else {
      await ctx.reply(
        "Kechirasiz, sizning raqamingiz ro'yxatdan o'tmagan yoki faolsiz."
      );
      return;
    }
  } catch (e) {
    console.log("phone.js: " + e);
  }
});

phoneScene.on("text", async (ctx) => {
  try {
    await ctx.reply(
      "Iltimos, telefon raqamingizni tugma orqali yuboring: ",
      Markup.keyboard([
        Markup.button.contactRequest("📱 Telefon raqamni yuborish"),
      ])
        .resize()
        .oneTime()
    );
  } catch (e) {
    console.log("phone.js: " + e);
  }
});

export default phoneScene;
