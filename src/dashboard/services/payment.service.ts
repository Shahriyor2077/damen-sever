import Employee, { IEmployee } from "../../schemas/employee.schema";
import IJwtUser from "../../types/user";
import Payment, {
  PaymentStatus,
  PaymentType,
} from "../../schemas/payment.schema";
import { Debtor } from "../../schemas/debtor.schema";
import BaseError from "../../utils/base.error";
import Notes from "../../schemas/notes.schema";
import { Balance } from "../../schemas/balance.schema";
import Contract, { ContractStatus } from "../../schemas/contract.schema";
import { Types } from "mongoose";

interface PaymentDto {
  contractId: string;
  amount: number;
  notes?: string;
  currencyDetails: {
    dollar: number;
    sum: number;
  };
  currencyCourse: number;
}

class PaymentService {
  /**
   * Balance yangilash
   * Requirements: 2.2, 8.3
   */
  private async updateBalance(
    managerId: IEmployee | string,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    try {
      let balance = await Balance.findOne({ managerId });

      if (!balance) {
        balance = await Balance.create({
          managerId,
          dollar: changes.dollar || 0,
          sum: changes.sum || 0,
        });
        console.log("✅ New balance created:", balance._id);
      } else {
        balance.dollar += changes.dollar || 0;
        balance.sum += changes.sum || 0;
        await balance.save();
        console.log("✅ Balance updated:", balance._id);
      }

      return balance;
    } catch (error) {
      console.error("❌ Error updating balance:", error);
      throw error;
    }
  }

  /**
   * Shartnoma to'liq to'langanini tekshirish
   * Requirements: 8.4
   */
  private async checkContractCompletion(contractId: string) {
    try {
      const contract = await Contract.findById(contractId).populate("payments");

      if (!contract) {
        return;
      }

      const totalPaid = (contract.payments as any[])
        .filter((p) => p.isPaid)
        .reduce((sum, p) => sum + p.amount, 0);

      console.log("📊 Contract completion check:", {
        contractId,
        totalPaid,
        totalPrice: contract.totalPrice,
        isComplete: totalPaid >= contract.totalPrice,
      });

      if (totalPaid >= contract.totalPrice) {
        contract.status = ContractStatus.COMPLETED;
        await contract.save();
        console.log("✅ Contract completed:", contract._id);
      }
    } catch (error) {
      console.error("❌ Error checking contract completion:", error);
      throw error;
    }
  }

  /**
   * To'lov qabul qilish (Manager tomonidan)
   * Requirements: 8.1
   */
  async receivePayment(data: PaymentDto, user: IJwtUser) {
    try {
      console.log("💰 === RECEIVING PAYMENT ===");
      console.log("Contract ID:", data.contractId);
      console.log("Amount:", data.amount);

      const contract = await Contract.findById(data.contractId);

      if (!contract) {
        throw BaseError.NotFoundError("Shartnoma topilmadi");
      }

      const manager = await Employee.findById(user.sub);

      if (!manager) {
        throw BaseError.NotFoundError("Manager topilmadi");
      }

      // 1. Notes yaratish
      const notes = await Notes.create({
        text: data.notes || `To'lov: ${data.amount}`,
        customer: contract.customer,
        createBy: user.sub,
      });

      // 2. Payment yaratish (isPaid: false - kassa tasdiqlashi kerak)
      const payment = await Payment.create({
        amount: data.amount,
        date: new Date(),
        isPaid: false, // ❌ Hali tasdiqlanmagan
        paymentType: PaymentType.MONTHLY,
        customerId: contract.customer,
        managerId: user.sub,
        notes: notes._id,
        status: PaymentStatus.PENDING,
        expectedAmount: contract.monthlyPayment,
      });

      console.log("✅ Payment created (PENDING):", payment._id);
      console.log("⏳ Waiting for cash confirmation...");

      // ❌ Balance yangilanmaydi - faqat kassa tasdiqlanganda
      // ❌ Contract.payments ga qo'shilmaydi - faqat kassa tasdiqlanganda

      return {
        status: "success",
        message: "To'lov qabul qilindi, kassa tasdiqlashi kutilmoqda",
        paymentId: payment._id,
      };
    } catch (error) {
      console.error("❌ Error receiving payment:", error);
      throw error;
    }
  }

  /**
   * To'lovni tasdiqlash (Kassa tomonidan)
   * Requirements: 8.2, 8.3, 8.4
   */
  async confirmPayment(paymentId: string, user: IJwtUser) {
    try {
      console.log("✅ === CONFIRMING PAYMENT ===");
      console.log("Payment ID:", paymentId);

      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw BaseError.NotFoundError("To'lov topilmadi");
      }

      if (payment.isPaid) {
        throw BaseError.BadRequest("To'lov allaqachon tasdiqlangan");
      }

      // 1. Payment'ni tasdiqlash
      payment.isPaid = true;
      payment.status = PaymentStatus.PAID;
      payment.confirmedAt = new Date();
      payment.confirmedBy = user.sub as any;
      await payment.save();

      console.log("✅ Payment confirmed:", payment._id);

      // 2. Contract'ni topish
      const contract = await Contract.findOne({
        customer: payment.customerId,
        status: ContractStatus.ACTIVE,
      });

      if (!contract) {
        throw BaseError.NotFoundError("Shartnoma topilmadi");
      }

      // 3. Contract.payments ga qo'shish
      if (!contract.payments) {
        contract.payments = [];
      }
      (contract.payments as string[]).push(payment._id.toString());
      await contract.save();

      console.log("✅ Payment added to contract:", contract._id);

      // 4. Balance yangilash (FAQAT BU YERDA)
      await this.updateBalance(payment.managerId, {
        dollar: payment.amount,
        sum: 0,
      });

      console.log("💵 Balance updated for manager:", payment.managerId);

      // 5. Agar Debtor mavjud bo'lsa, o'chirish
      const deletedDebtors = await Debtor.deleteMany({
        contractId: contract._id,
      });

      if (deletedDebtors.deletedCount > 0) {
        console.log("🗑️ Debtor(s) deleted:", deletedDebtors.deletedCount);
      }

      // 6. Shartnoma to'liq to'langanini tekshirish
      await this.checkContractCompletion(String(contract._id));

      return {
        status: "success",
        message: "To'lov tasdiqlandi",
        paymentId: payment._id,
        contractId: contract._id,
      };
    } catch (error) {
      console.error("❌ Error confirming payment:", error);
      throw error;
    }
  }

  /**
   * To'lovni rad etish (Kassa tomonidan)
   * Requirements: 8.5
   */
  async rejectPayment(paymentId: string, reason: string, user: IJwtUser) {
    try {
      console.log("❌ === REJECTING PAYMENT ===");
      console.log("Payment ID:", paymentId);
      console.log("Reason:", reason);

      const payment = await Payment.findById(paymentId).populate("notes");

      if (!payment) {
        throw BaseError.NotFoundError("To'lov topilmadi");
      }

      if (payment.isPaid) {
        throw BaseError.BadRequest("Tasdiqlangan to'lovni rad etib bo'lmaydi");
      }

      // 1. Payment status'ni o'zgartirish
      payment.status = PaymentStatus.REJECTED;
      await payment.save();

      // 2. Notes'ga rad etish sababini qo'shish
      if (payment.notes) {
        payment.notes.text += `\n[RAD ETILDI: ${reason}]`;
        await payment.notes.save();
      }

      console.log("✅ Payment rejected:", payment._id);

      return {
        status: "success",
        message: "To'lov rad etildi",
        paymentId: payment._id,
      };
    } catch (error) {
      console.error("❌ Error rejecting payment:", error);
      throw error;
    }
  }

  /**
   * To'lovlar tarixini olish
   * Requirements: 7.1, 7.2
   */
  async getPaymentHistory(customerId?: string, contractId?: string) {
    try {
      console.log("📜 Getting payment history for:", {
        customerId,
        contractId,
      });

      let matchCondition: any = { isPaid: true };

      if (customerId) {
        matchCondition.customerId = new Types.ObjectId(customerId);
      }

      if (contractId) {
        const contract = await Contract.findById(contractId);
        if (contract) {
          matchCondition.customerId = new Types.ObjectId(
            contract.customer.toString()
          );
        }
      }

      const payments = await Payment.aggregate([
        { $match: matchCondition },
        {
          $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
          },
        },
        { $unwind: "$customer" },
        {
          $lookup: {
            from: "employees",
            localField: "managerId",
            foreignField: "_id",
            as: "manager",
          },
        },
        { $unwind: "$manager" },
        {
          $lookup: {
            from: "notes",
            localField: "notes",
            foreignField: "_id",
            as: "notes",
          },
        },
        {
          $addFields: {
            customerName: {
              $concat: [
                "$customer.firstName",
                " ",
                { $ifNull: ["$customer.lastName", ""] },
              ],
            },
            managerName: {
              $concat: [
                "$manager.firstName",
                " ",
                { $ifNull: ["$manager.lastName", ""] },
              ],
            },
            notes: { $ifNull: [{ $arrayElemAt: ["$notes.text", 0] }, ""] },
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            date: 1,
            paymentType: 1,
            customerName: 1,
            managerName: 1,
            notes: 1,
            status: 1,
          },
        },
        { $sort: { date: -1 } },
      ]);

      console.log("✅ Found payments:", payments.length);

      return {
        status: "success",
        data: payments,
      };
    } catch (error) {
      console.error("❌ Error getting payment history:", error);
      throw BaseError.InternalServerError("To'lovlar tarixini olishda xatolik");
    }
  }

  /**
   * Shartnoma bo'yicha to'lov qilish (to'g'ridan-to'g'ri tasdiqlangan)
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async payByContract(
    payData: {
      contractId: string;
      amount: number;
      notes?: string;
      currencyDetails: { dollar: number; sum: number };
      currencyCourse: number;
    },
    user: IJwtUser
  ) {
    try {
      console.log("💰 === PAY BY CONTRACT (DIRECT) ===");

      const contract = await Contract.findById(payData.contractId).populate(
        "customer"
      );

      if (!contract) {
        throw BaseError.NotFoundError("Shartnoma topilmadi");
      }

      const manager = await Employee.findById(user.sub);

      if (!manager) {
        throw BaseError.NotFoundError("Manager topilmadi");
      }

      // 1. Notes yaratish
      const notes = await Notes.create({
        text: payData.notes || `To'lov: ${payData.amount}`,
        customer: contract.customer,
        createBy: String(manager._id),
      });

      // 2. Payment yaratish (to'g'ridan-to'g'ri tasdiqlangan)
      const payment = await Payment.create({
        amount: payData.amount,
        date: new Date(),
        isPaid: true,
        paymentType: PaymentType.MONTHLY,
        customerId: contract.customer,
        managerId: String(manager._id),
        notes: notes._id,
        status: PaymentStatus.PAID,
        confirmedAt: new Date(),
        confirmedBy: user.sub,
      });

      // 3. Contract.payments ga qo'shish
      if (!contract.payments) {
        contract.payments = [];
      }
      (contract.payments as string[]).push(payment._id.toString());
      await contract.save();

      // 4. Balance yangilash
      await this.updateBalance(String(manager._id), {
        dollar: payData.currencyDetails?.dollar || 0,
        sum: payData.currencyDetails?.sum || 0,
      });

      // 5. Debtor'ni o'chirish
      await Debtor.deleteMany({
        contractId: contract._id,
      });

      // 6. Shartnoma to'liq to'langanini tekshirish
      await this.checkContractCompletion(String(contract._id));

      console.log("✅ Payment completed:", {
        contractId: contract._id,
        paymentId: payment._id,
        amount: payData.amount,
      });

      return {
        status: "success",
        message: "To'lov muvaffaqiyatli amalga oshirildi",
        contractId: contract._id,
        paymentId: payment._id,
      };
    } catch (error) {
      console.error("❌ Error in payByContract:", error);
      throw error;
    }
  }

  /**
   * Debtor bo'yicha to'lov qilish (Dashboard)
   * Requirements: 8.1, 8.2, 8.3, 8.4
   */
  async update(
    payData: {
      id: string;
      amount: number;
      notes?: string;
      currencyDetails: { dollar: number; sum: number };
      currencyCourse: number;
    },
    user: IJwtUser
  ) {
    try {
      console.log("💰 === DEBTOR PAYMENT (DASHBOARD) ===");

      const existingDebtor = await Debtor.findById(payData.id).populate(
        "contractId"
      );

      if (!existingDebtor) {
        throw BaseError.NotFoundError("Qarizdorlik topilmadi yoki o'chirilgan");
      }

      const customer = existingDebtor.contractId.customer;
      const manager = await Employee.findById(user.sub);

      if (!manager) {
        throw BaseError.NotFoundError("Manager topilmadi yoki o'chirilgan");
      }

      // 1. Notes yaratish
      const notes = await Notes.create({
        text: payData.notes || `To'lov: ${payData.amount}`,
        customer,
        createBy: String(manager._id),
      });

      // 2. Payment yaratish (to'g'ridan-to'g'ri tasdiqlangan)
      const paymentDoc = await Payment.create({
        amount: payData.amount,
        date: new Date(),
        isPaid: true,
        paymentType: PaymentType.MONTHLY,
        customerId: customer,
        managerId: String(manager._id),
        notes: notes._id,
        status: PaymentStatus.PAID,
        confirmedAt: new Date(),
        confirmedBy: user.sub,
      });

      // 3. Contract.payments ga qo'shish
      const contract = await Contract.findById(existingDebtor.contractId._id);
      if (contract) {
        if (!contract.payments) {
          contract.payments = [];
        }
        (contract.payments as string[]).push(paymentDoc._id.toString());
        await contract.save();
      }

      // 4. Balance yangilash
      await this.updateBalance(String(manager._id), {
        dollar: payData.currencyDetails?.dollar || 0,
        sum: payData.currencyDetails?.sum || 0,
      });

      // 5. Debtor'ni o'chirish
      await Debtor.findByIdAndDelete(payData.id);

      // 6. Shartnoma to'liq to'langanini tekshirish
      if (contract) {
        await this.checkContractCompletion(String(contract._id));
      }

      console.log("✅ Debtor payment completed");

      return {
        status: "success",
        message: "To'lov amalga oshirildi",
      };
    } catch (error) {
      console.error("❌ Error in debtor payment:", error);
      throw error;
    }
  }
}

export default new PaymentService();
