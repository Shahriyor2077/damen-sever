import XLSX from "xlsx";
import { unlink } from "fs/promises";
import Auth from "../../schemas/auth.schema";
import Customer from "../../schemas/customer.schema";
import Contract, { ContractStatus } from "../../schemas/contract.schema";
import Payment, {
  PaymentStatus,
  PaymentType,
} from "../../schemas/payment.schema";
import Notes from "../../schemas/notes.schema";
import { Balance } from "../../schemas/balance.schema";
import BaseError from "../../utils/base.error";
import IJwtUser from "../../types/user";
import Employee from "../../schemas/employee.schema";

interface ExcelRow {
  startDate: number | string;
  initialPaymentDueDate?: number | string;
  nextPaymentDate: number | string;
  customer: string;
  productName: string;
  originalPrice: number;
  price: number;
  initialPayment: number;
  period: number;
  monthlyPayment: number;
  totalPrice: number;
  percentage: number;
  notes?: string;
  box?: string;
  mbox?: string;
  receipt?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  stats: {
    totalRows: number;
    customersCreated: number;
    customersFound: number; // Topilgan mijozlar soni
    contractsCreated: number;
    paymentsCreated: number; // Yaratilgan to'lovlar soni (initial + monthly)
    errors: number;
  };
  errors: Array<{
    row: number;
    customer: string;
    error: string;
    details?: string[]; // Validatsiya xatoliklari uchun
  }>;
}

class ExcelImportService {
  /**
   * Excel serial date'ni JavaScript Date'ga o'girish
   * Turli formatlarni qo'llab-quvvatlaydi: number (Excel serial) va string (ISO format)
   * UTC va local time bilan to'g'ri ishlaydi
   */
  private excelDateToJSDate(serial: number | string): Date {
    // Agar string bo'lsa, to'g'ridan-to'g'ri Date obyektiga o'girish
    if (typeof serial === "string") {
      const date = new Date(serial);
      // Agar valid date bo'lsa, qaytarish
      if (!isNaN(date.getTime())) {
        return new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          0,
          0,
          0,
          0
        );
      }
      // Agar string number bo'lsa, number ga o'girish
      const numericValue = parseFloat(serial);
      if (!isNaN(numericValue)) {
        serial = numericValue;
      } else {
        // Agar parse qilib bo'lmasa, bugungi sanani qaytarish
        console.warn(
          `⚠️ Noto'g'ri sana formati: ${serial}, bugungi sana ishlatiladi`
        );
        const today = new Date();
        return new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          0,
          0,
          0,
          0
        );
      }
    }

    // Excel serial date'ni konvertatsiya qilish
    // Excel'da 1900-01-01 = 1, lekin Excel'da 1900 yil leap year deb hisoblanadi (xato)
    // JavaScript'da to'g'ri hisoblash uchun 25569 ni ayiramiz (1970-01-01 gacha kunlar)
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; // Sekundlarga o'girish
    const date_info = new Date(utc_value * 1000); // Millisekundlarga o'girish

    // UTC'dan local time'ga o'tkazish (faqat yil, oy, kun)
    // Soat, minut, sekund, millisekund 0 ga o'rnatish
    return new Date(
      date_info.getUTCFullYear(),
      date_info.getUTCMonth(),
      date_info.getUTCDate(),
      0,
      0,
      0,
      0
    );
  }

  /**
   * Mijoz ismini parse qilish (firstName va lastName)
   */
  private parseCustomerName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: "" };
    }
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(" "),
    };
  }

  /**
   * Qatorni validatsiya qilish
   * Majburiy maydonlar, raqamli qiymatlar va sanalarni tekshiradi
   * @param row - Excel qatori
   * @param rowNumber - Qator raqami (logging uchun)
   * @returns Validatsiya xatoliklari array sifatida
   */
  private validateRow(row: ExcelRow, rowNumber: number): string[] {
    const errors: string[] = [];

    // Majburiy maydonlarni tekshirish
    if (!row.customer || row.customer.trim() === "") {
      errors.push("Mijoz ismi kiritilmagan");
    }

    if (!row.productName || row.productName.trim() === "") {
      errors.push("Mahsulot nomi kiritilmagan");
    }

    // Raqamli maydonlarni validatsiya qilish
    if (
      row.price === undefined ||
      row.price === null ||
      typeof row.price !== "number" ||
      row.price <= 0
    ) {
      errors.push("Narx noto'g'ri yoki 0 dan kichik");
    }

    if (
      row.period === undefined ||
      row.period === null ||
      typeof row.period !== "number" ||
      row.period <= 0
    ) {
      errors.push("Muddat noto'g'ri yoki 0 dan kichik");
    }

    if (
      row.monthlyPayment === undefined ||
      row.monthlyPayment === null ||
      typeof row.monthlyPayment !== "number" ||
      row.monthlyPayment <= 0
    ) {
      errors.push("Oylik to'lov noto'g'ri yoki 0 dan kichik");
    }

    // Sana maydonlarini tekshirish
    if (!row.startDate) {
      errors.push("Boshlanish sanasi kiritilmagan");
    } else {
      // Agar startDate string bo'lsa, uni parse qilishga harakat qilish
      if (typeof row.startDate === "string") {
        const date = new Date(row.startDate);
        if (isNaN(date.getTime())) {
          // Agar string number bo'lsa, tekshirish
          const numericValue = parseFloat(row.startDate);
          if (isNaN(numericValue)) {
            errors.push("Boshlanish sanasi noto'g'ri formatda");
          }
        }
      } else if (typeof row.startDate === "number") {
        // Excel serial date 1 dan katta bo'lishi kerak
        if (row.startDate < 1) {
          errors.push("Boshlanish sanasi noto'g'ri");
        }
      }
    }

    return errors;
  }

  /**
   * Excel faylni o'qish va parse qilish
   */
  async parseExcelFile(filePath: string): Promise<ExcelRow[]> {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

      // Birinchi qatorni (header) o'tkazib yuborish
      return jsonData.slice(1);
    } catch (error) {
      console.error("❌ Error parsing Excel file:", error);
      throw BaseError.BadRequest("Excel faylni o'qishda xatolik");
    }
  }

  /**
   * Mijoz yaratish yoki topish
   */
  private async findOrCreateCustomer(
    customerName: string,
    user: IJwtUser
  ): Promise<any> {
    const { firstName, lastName } = this.parseCustomerName(customerName);

    // Avval mavjud mijozni qidirish
    let customer = await Customer.findOne({
      firstName: { $regex: new RegExp(`^${firstName}$`, "i") },
      lastName: { $regex: new RegExp(`^${lastName}$`, "i") },
      isDeleted: false,
    });

    if (customer) {
      // Requirement 8.2: Mijoz topilganda log
      console.log(
        `      ✅ Mijoz bazada topildi: ${firstName} ${lastName} (ID: ${customer._id})`
      );
      return customer;
    }

    // Yangi mijoz yaratish
    // Requirement 8.2: Yangi mijoz yaratilganda log
    console.log(`      ➕ Yangi mijoz yaratilmoqda: ${firstName} ${lastName}`);

    // Auth yaratish
    console.log(`      🔐 Auth obyekti yaratilmoqda...`);
    const auth = await Auth.create({
      password: "", // Bo'sh parol - keyinchalik to'ldiriladi
    });
    console.log(`      ✅ Auth yaratildi (ID: ${auth._id})`);

    // Customer yaratish (minimal ma'lumotlar bilan)
    console.log(`      👤 Customer obyekti yaratilmoqda...`);
    customer = await Customer.create({
      firstName,
      lastName,
      phoneNumber: "", // Bo'sh - keyinchalik to'ldiriladi
      address: "", // Bo'sh - keyinchalik to'ldiriladi
      passportSeries: "", // Bo'sh - keyinchalik to'ldiriladi
      birthDate: new Date(), // Default sana
      auth: auth._id,
      manager: user.sub, // Import qilayotgan xodim
      isActive: true,
      createBy: user.sub,
    });

    console.log(
      `      ✅ Mijoz muvaffaqiyatli yaratildi (ID: ${customer._id})`
    );
    console.log(`      👨‍💼 Manager: ${user.sub}`);
    return customer;
  }

  /**
   * Oylik to'lovlarni generatsiya qilish
   * Contract period asosida barcha oylik to'lovlarni yaratadi
   * @param contract - Shartnoma obyekti
   * @param customer - Mijoz obyekti
   * @param user - Foydalanuvchi ma'lumotlari
   * @returns Yaratilgan to'lovlar array sifatida
   */
  private async generateMonthlyPayments(
    contract: any,
    customer: any,
    user: IJwtUser
  ): Promise<any[]> {
    try {
      const payments: any[] = [];
      const period = contract.period; // Oylar soni
      const monthlyPayment = contract.monthlyPayment;
      const startDate = new Date(contract.nextPaymentDate); // Birinchi oylik to'lov sanasi

      // Requirement 8.4: Oylik to'lovlar yaratilganda log
      console.log(
        `      💰 ${period} ta oylik to'lov generatsiya qilinmoqda...`
      );
      console.log(
        `      📅 Birinchi to'lov sanasi: ${startDate.toLocaleDateString()}`
      );
      console.log(`      💵 Oylik to'lov summasi: ${monthlyPayment}`);

      // Har bir oy uchun to'lov yaratish
      for (let i = 0; i < period; i++) {
        // Har bir to'lov uchun sanani hisoblash (har oy)
        const paymentDate = new Date(startDate);
        paymentDate.setMonth(paymentDate.getMonth() + i);

        // Har bir to'lov uchun Notes yaratish
        const paymentNotes = await Notes.create({
          text: `Oylik to'lov ${i + 1}/${period}: ${monthlyPayment}`,
          customer: customer._id,
          createBy: user.sub,
        });

        // To'lov yaratish
        const payment = await Payment.create({
          amount: monthlyPayment,
          date: paymentDate,
          isPaid: false,
          paymentType: PaymentType.MONTHLY,
          customerId: customer._id,
          managerId: user.sub,
          notes: paymentNotes._id,
          status: PaymentStatus.PENDING,
          expectedAmount: monthlyPayment,
        });

        payments.push(payment);

        // Contract.payments arrayiga qo'shish
        (contract.payments as any[]).push(payment._id);

        // Requirement 8.4: Har bir to'lov yaratilganda log
        console.log(
          `         ✅ To'lov ${
            i + 1
          }/${period} yaratildi: ${paymentDate.toLocaleDateString()} - ${monthlyPayment} (ID: ${
            payment._id
          })`
        );
      }

      // Contract'ni saqlash
      await contract.save();

      // Requirement 8.4: To'lovlar yaratilganda log
      console.log(
        `      ✅ ${payments.length} ta oylik to'lov muvaffaqiyatli yaratildi va shartnomaga bog'landi`
      );

      return payments;
    } catch (error) {
      console.error("❌ Error generating monthly payments:", error);
      throw error;
    }
  }

  /**
   * Yuklangan faylni o'chirish
   * Import tugagandan keyin (muvaffaqiyatli yoki xatolik bilan) faylni tozalaydi
   * @param filePath - O'chiriladigan fayl yo'li
   */
  private async cleanupFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath);
      console.log(`🗑️ Fayl muvaffaqiyatli o'chirildi: ${filePath}`);
    } catch (error: any) {
      // Xatolikni log qilish lekin asosiy jarayonni to'xtatmaslik
      console.error(
        `⚠️ Faylni o'chirishda xatolik: ${filePath}`,
        error.message
      );
      // Xatolikni throw qilmaslik - cleanup xatoligi asosiy jarayonni buzmasligi kerak
    }
  }

  /**
   * Shartnoma yaratish
   * Barcha zarur maydonlarni to'ldiradi va to'lovlarni generatsiya qiladi
   * @param row - Excel qatori ma'lumotlari
   * @param customer - Mijoz obyekti
   * @param user - Foydalanuvchi ma'lumotlari
   * @returns Yaratilgan shartnoma obyekti
   */
  private async createContract(
    row: ExcelRow,
    customer: any,
    user: IJwtUser
  ): Promise<any> {
    try {
      console.log(`📝 Shartnoma yaratilmoqda: ${row.productName}`);

      // Sanalarni parse qilish (number yoki string formatda)
      const startDate = row.startDate
        ? this.excelDateToJSDate(row.startDate)
        : new Date();

      const nextPaymentDate = row.nextPaymentDate
        ? this.excelDateToJSDate(row.nextPaymentDate)
        : new Date();

      console.log(
        `      📅 Boshlanish sanasi: ${startDate.toLocaleDateString()}`
      );
      console.log(
        `      📅 Keyingi to'lov sanasi: ${nextPaymentDate.toLocaleDateString()}`
      );

      // Notes yaratish (shartnoma uchun)
      console.log(`      📋 Shartnoma uchun Notes yaratilmoqda...`);
      const notes = await Notes.create({
        text: row.notes || `Excel'dan import qilingan: ${row.productName}`,
        customer: customer._id,
        createBy: user.sub,
      });

      console.log(`      ✅ Notes yaratildi (ID: ${notes._id})`);

      // Info obyektini to'g'ri yaratish
      // "bor" so'zi true ga, boshqa qiymatlar false ga aylanadi
      const info = {
        box: row.box === "bor",
        mbox: row.mbox === "bor",
        receipt: row.receipt === "bor",
        iCloud: false, // Default qiymat
      };

      console.log(
        `      📦 Info obyekti: Box=${info.box}, MBox=${info.mbox}, Receipt=${info.receipt}`
      );

      // Contract yaratish - barcha zarur maydonlarni to'ldirish
      console.log(`      📝 Contract obyekti yaratilmoqda...`);
      const contract = await Contract.create({
        customer: customer._id,
        productName: row.productName,
        originalPrice: row.originalPrice || 0,
        price: row.price,
        initialPayment: row.initialPayment || 0,
        percentage: row.percentage || 30,
        period: row.period,
        monthlyPayment: row.monthlyPayment,
        totalPrice: row.totalPrice || row.price,
        startDate,
        initialPaymentDueDate: nextPaymentDate,
        nextPaymentDate,
        notes: notes._id,
        isActive: true,
        createBy: user.sub,
        status: ContractStatus.ACTIVE,
        info,
        payments: [], // Bo'sh array - keyinchalik to'ldiriladi
      });

      // Requirement 8.3: Shartnoma yaratilganda log
      console.log(
        `      ✅ Shartnoma muvaffaqiyatli yaratildi (ID: ${contract._id})`
      );
      console.log(
        `      💵 Narx: ${contract.price}, Muddat: ${contract.period} oy, Oylik: ${contract.monthlyPayment}`
      );
      console.log(
        `      📊 Status: ${contract.status}, Boshlang'ich to'lov: ${contract.initialPayment}`
      );

      // Initial payment yaratish (agar mavjud bo'lsa)
      // Requirement 5.1: InitialPayment > 0 bo'lganda to'lovni yaratish
      if (row.initialPayment && row.initialPayment > 0) {
        console.log(
          `💰 Boshlang'ich to'lov yaratilmoqda: ${row.initialPayment}`
        );

        // Requirement 5.4: To'lov Notes'ini yaratish
        const paymentNotes = await Notes.create({
          text: `Boshlang'ich to'lov: $${row.initialPayment}`,
          customer: customer._id,
          createBy: user.sub,
        });

        console.log(`📋 To'lov Notes yaratildi: ${paymentNotes._id}`);

        // Requirement 5.2: PaymentType.INITIAL va PaymentStatus.PAID statuslarini to'g'ri belgilash
        const payment = await Payment.create({
          amount: row.initialPayment,
          date: startDate,
          isPaid: true,
          paymentType: PaymentType.INITIAL,
          customerId: customer._id,
          managerId: user.sub,
          notes: paymentNotes._id,
          status: PaymentStatus.PAID,
          confirmedAt: new Date(),
          confirmedBy: user.sub,
          expectedAmount: row.initialPayment, // Kutilgan summa
        });

        console.log(`✅ Boshlang'ich to'lov yaratildi: ${payment._id}`);
        console.log(`   - Summa: ${payment.amount}`);
        console.log(`   - Status: ${payment.status}`);
        console.log(`   - Turi: ${payment.paymentType}`);

        // Requirement 5.5: Contract.payments arrayiga qo'shish
        (contract.payments as any[]).push(payment._id);
        await contract.save();
        console.log(`✅ To'lov shartnomaga bog'landi`);

        // Requirement 5.3: Balance yangilashni saqlash
        try {
          let balance = await Balance.findOne({ managerId: user.sub });
          if (!balance) {
            // Yangi balance yaratish
            balance = await Balance.create({
              managerId: user.sub,
              dollar: row.initialPayment,
              sum: 0,
            });
            console.log(
              `💳 Yangi balance yaratildi: ${row.initialPayment} dollar`
            );
          } else {
            // Mavjud balanceni yangilash
            balance.dollar += row.initialPayment;
            await balance.save();
            console.log(
              `💳 Balance yangilandi: +${row.initialPayment} dollar (Jami: ${balance.dollar})`
            );
          }
        } catch (balanceError: any) {
          // Balance yangilashda xatolik bo'lsa, log qilish lekin jarayonni davom ettirish
          console.error(
            `⚠️ Balance yangilashda xatolik:`,
            balanceError.message
          );
          // To'lov yaratilgan, faqat balance yangilanmagan
          // Bu holat keyinchalik qo'lda tuzatilishi mumkin
        }
      }

      // Oylik to'lovlarni generatsiya qilish
      console.log(`🔄 Oylik to'lovlar generatsiya qilinmoqda...`);
      await this.generateMonthlyPayments(contract, customer, user);

      console.log(
        `✅ Shartnoma to'liq yaratildi va to'lovlar generatsiya qilindi: ${contract._id}`
      );
      return contract;
    } catch (error) {
      console.error("❌ Shartnoma yaratishda xatolik:", error);
      throw error;
    }
  }

  /**
   * Excel faylni import qilish
   * Requirement 7.1: Har bir qatorda xatolik yuz bersa, import jarayonini to'xtatmaydi
   * Requirement 7.2: Xatolik ma'lumotlarini (qator raqami, mijoz ismi, xatolik matni) saqlaydi
   * Requirement 7.3: Umumiy statistikani qaytaradi
   * Requirement 7.4: Barcha xatoliklar ro'yxatini qaytaradi
   * Requirement 7.5: Hech qanday xatolik bo'lmasa, muvaffaqiyat xabarini qaytaradi
   */
  async importFromExcel(
    filePath: string,
    user: IJwtUser
  ): Promise<ImportResult> {
    // Requirement 8.1: Import boshlanishida batafsil log
    console.log("📊 === EXCEL IMPORT STARTED ===");
    console.log("📁 Fayl yo'li:", filePath);
    console.log("👤 Foydalanuvchi ID:", user.sub);
    console.log("🕐 Boshlanish vaqti:", new Date().toLocaleString());
    console.log("=".repeat(50));

    const result: ImportResult = {
      success: true,
      message: "",
      stats: {
        totalRows: 0,
        customersCreated: 0,
        customersFound: 0,
        contractsCreated: 0,
        paymentsCreated: 0,
        errors: 0,
      },
      errors: [],
    };

    // Mijozlarni kuzatish uchun Set (dublikatlarni oldini olish)
    const processedCustomers = new Set<string>();

    try {
      // Excel faylni o'qish
      console.log("📖 Excel fayl o'qilmoqda...");
      const rows = await this.parseExcelFile(filePath);
      result.stats.totalRows = rows.length;

      console.log(`✅ Excel fayl muvaffaqiyatli o'qildi`);
      console.log(`📋 Jami qatorlar: ${rows.length}`);
      console.log("🔄 Qatorlarni qayta ishlash boshlandi...");
      console.log("=".repeat(50));

      // Har bir qatorni qayta ishlash
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = i + 2; // Excel'da 1-qator header, 2-qatordan boshlanadi

        console.log(`\n🔍 Qator ${rowNumber} qayta ishlanmoqda...`);
        console.log(`   Mijoz: ${row.customer || "Noma'lum"}`);
        console.log(`   Mahsulot: ${row.productName || "Noma'lum"}`);

        try {
          // Requirement 7.2: Validatsiya qo'shish
          const validationErrors = this.validateRow(row, rowNumber);
          if (validationErrors.length > 0) {
            // Validatsiya xatoliklarini details bilan throw qilish
            const error: any = new Error(
              `Validatsiya xatoliklari: ${validationErrors.join(", ")}`
            );
            error.details = validationErrors;
            throw error;
          }

          // Mijoz yaratish yoki topish
          console.log(`   🔍 Mijoz qidirilmoqda: ${row.customer}`);
          const customerBeforeCount = await Customer.countDocuments({
            isDeleted: false,
          });
          const customer = await this.findOrCreateCustomer(row.customer, user);
          const customerAfterCount = await Customer.countDocuments({
            isDeleted: false,
          });

          // Mijoz yaratilganini yoki topilganini aniqlash
          const customerId = customer._id.toString();
          if (!processedCustomers.has(customerId)) {
            processedCustomers.add(customerId);
            if (customerAfterCount > customerBeforeCount) {
              // Requirement 8.2: Yangi mijoz yaratilganda log
              result.stats.customersCreated++;
              console.log(
                `   ✅ Yangi mijoz yaratildi: ${customer.firstName} ${customer.lastName} (ID: ${customerId})`
              );
              console.log(
                `   📊 Jami yaratilgan mijozlar: ${result.stats.customersCreated}`
              );
            } else {
              // Requirement 8.2: Mijoz topilganda log
              result.stats.customersFound++;
              console.log(
                `   ✅ Mavjud mijoz topildi: ${customer.firstName} ${customer.lastName} (ID: ${customerId})`
              );
              console.log(
                `   📊 Jami topilgan mijozlar: ${result.stats.customersFound}`
              );
            }
          } else {
            console.log(
              `   ℹ️ Mijoz allaqachon qayta ishlangan: ${customer.firstName} ${customer.lastName}`
            );
          }

          // Shartnoma yaratish (ichida initial va monthly payments yaratiladi)
          console.log(`   📝 Shartnoma yaratilmoqda...`);
          const paymentsBeforeCount = await Payment.countDocuments();
          const contract = await this.createContract(row, customer, user);
          const paymentsAfterCount = await Payment.countDocuments();

          // Yaratilgan to'lovlar sonini hisoblash
          const paymentsCreated = paymentsAfterCount - paymentsBeforeCount;
          result.stats.paymentsCreated += paymentsCreated;
          result.stats.contractsCreated++;

          // Requirement 8.3: Shartnoma yaratilganda log
          console.log(
            `   ✅ Shartnoma muvaffaqiyatli yaratildi (ID: ${contract._id})`
          );
          console.log(
            `   💰 ${paymentsCreated} ta to'lov yaratildi (initial + monthly)`
          );
          console.log(
            `   📊 Jami shartnomalar: ${result.stats.contractsCreated}`
          );
          console.log(`   📊 Jami to'lovlar: ${result.stats.paymentsCreated}`);
          console.log(`✅ Qator ${rowNumber} muvaffaqiyatli qayta ishlandi`);
        } catch (error: any) {
          // Requirement 7.1: Xatolik yuz bersa, import jarayonini to'xtatmaslik
          // Requirement 8.6: Xatoliklar uchun batafsil log
          console.error(`\n❌ XATOLIK - Qator ${rowNumber}`);
          console.error(`   Mijoz: ${row.customer || "Noma'lum"}`);
          console.error(`   Mahsulot: ${row.productName || "Noma'lum"}`);
          console.error(`   Xatolik: ${error.message}`);

          result.stats.errors++;

          // Requirement 7.2: Xatolik ma'lumotlarini saqlash
          // Validatsiya xatoliklarini details ga qo'shish
          const errorDetails =
            error.details || this.validateRow(row, rowNumber);

          if (errorDetails.length > 0) {
            console.error(`   Tafsilotlar:`);
            errorDetails.forEach((detail: string, index: number) => {
              console.error(`     ${index + 1}. ${detail}`);
            });
          }

          result.errors.push({
            row: rowNumber,
            customer: row.customer || "Noma'lum",
            error: error.message,
            details: errorDetails.length > 0 ? errorDetails : undefined,
          });

          console.error(`   📊 Jami xatoliklar: ${result.stats.errors}`);
          console.error(`   ⚠️ Import davom ettirilmoqda...\n`);
        }
      }

      // Requirement 7.3 va 7.4: Umumiy statistika va xatoliklar ro'yxati
      // Requirement 7.5: Natija xabari
      if (result.stats.errors === 0) {
        result.message = `Barcha ma'lumotlar muvaffaqiyatli import qilindi! ${result.stats.contractsCreated} ta shartnoma, ${result.stats.paymentsCreated} ta to'lov yaratildi.`;
      } else {
        result.message = `Import yakunlandi. ${result.stats.contractsCreated} ta shartnoma, ${result.stats.paymentsCreated} ta to'lov yaratildi, ${result.stats.errors} ta xatolik.`;
        result.success = false;
      }

      // Requirement 8.5: Import tugaganda yakuniy statistika bilan log
      console.log("\n" + "=".repeat(50));
      console.log("🎉 === EXCEL IMPORT COMPLETED ===");
      console.log("🕐 Tugash vaqti:", new Date().toLocaleString());
      console.log("\n📊 YAKUNIY STATISTIKA:");
      console.log("─".repeat(50));
      console.log(`   📋 Jami qatorlar:           ${result.stats.totalRows}`);
      console.log(
        `   ➕ Yaratilgan mijozlar:     ${result.stats.customersCreated}`
      );
      console.log(
        `   ✅ Topilgan mijozlar:       ${result.stats.customersFound}`
      );
      console.log(
        `   📝 Yaratilgan shartnomalar:  ${result.stats.contractsCreated}`
      );
      console.log(
        `   💰 Yaratilgan to'lovlar:     ${result.stats.paymentsCreated}`
      );
      console.log(`   ❌ Xatoliklar:               ${result.stats.errors}`);
      console.log("─".repeat(50));

      if (result.stats.errors > 0) {
        console.log("\n⚠️ XATOLIKLAR RO'YXATI:");
        result.errors.forEach((err, index) => {
          console.log(`\n${index + 1}. Qator ${err.row}:`);
          console.log(`   Mijoz: ${err.customer}`);
          console.log(`   Xatolik: ${err.error}`);
          if (err.details && err.details.length > 0) {
            console.log(`   Tafsilotlar:`);
            err.details.forEach((detail, i) => {
              console.log(`     - ${detail}`);
            });
          }
        });
        console.log("\n" + "─".repeat(50));
      }

      console.log(
        `\n✅ Status: ${
          result.success ? "Muvaffaqiyatli" : "Xatoliklar bilan yakunlandi"
        }`
      );
      console.log(`💬 Xabar: ${result.message}`);
      console.log("=".repeat(50) + "\n");

      return result;
    } catch (error: any) {
      // Global xatolik (masalan, fayl o'qishda)
      // Requirement 8.6: Xatoliklar uchun batafsil log
      console.error("\n" + "=".repeat(50));
      console.error("❌ === EXCEL IMPORT FAILED ===");
      console.error("🕐 Xatolik vaqti:", new Date().toLocaleString());
      console.error("📁 Fayl:", filePath);
      console.error("👤 Foydalanuvchi:", user.sub);
      console.error("\n🔴 XATOLIK TAFSILOTLARI:");
      console.error("   Xabar:", error.message);
      console.error("   Turi:", error.name || "Unknown");
      if (error.stack) {
        console.error("   Stack trace:");
        console.error(error.stack);
      }
      console.error("=".repeat(50) + "\n");

      result.success = false;
      result.message = `Import xatolik bilan yakunlandi: ${error.message}`;
      return result;
    } finally {
      // Requirement 9.2 va 9.3: File cleanup (try-finally blokida)
      // Import muvaffaqiyatli yoki xatolik bilan tugaganidan qat'iy nazar, faylni tozalash
      await this.cleanupFile(filePath);
    }
  }
}

export default new ExcelImportService();
