import Employee, { IEmployee } from "../../schemas/employee.schema";
import IJwtUser from "../../types/user";
import { IPayment } from "../../schemas/payment.schema";
import { Debtor } from "../../schemas/debtor.schema";
import BaseError from "../../utils/base.error";
import { PayDebtDto } from "../../validators/payment";
import Notes from "../../schemas/notes.schema";
import { Balance } from "../../schemas/balance.schema";
import Contract from "../../schemas/contract.schema";

class PaymentSrvice {
  async addToBalance(
    managerId: IEmployee,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    try {
      let balance = await Balance.findOne({ managerId });

      if (!balance) {
        // Agar balans yo'q bo'lsa, yangi yaratamiz
        balance = await Balance.create({
          managerId,
          dollar: changes.dollar || 0,
          sum: changes.sum || 0,
        });
        console.log("New balance created for payment:", balance._id);
      } else {
        // Balansga qo'shamiz (to'lov qabul qilganda)
        balance.dollar += changes.dollar || 0;
        balance.sum += changes.sum || 0;
        await balance.save();
        console.log("Balance updated for payment:", balance._id);
      }

      return balance;
    } catch (error) {
      console.error("Error updating balance in payment:", error);
      throw error;
    }
  }

  async getPaymentHistory(customerId?: string, contractId?: string) {
    try {
      console.log("Getting payment history for:", { customerId, contractId });

      // 1. Payment collection'dan to'lovlarni olish
      let paymentMatchCondition: any = { isPaid: true };

      if (customerId) {
        const { Types } = await import("mongoose");
        paymentMatchCondition.customerId = new Types.ObjectId(customerId);
      }

      if (contractId) {
        const contract = await Contract.findById(contractId);
        if (contract) {
          const { Types } = await import("mongoose");
          paymentMatchCondition.customerId = new Types.ObjectId(
            contract.customer.toString()
          );
        }
      }

      const Payment = (await import("../../schemas/payment.schema")).default;
      const directPayments = await Payment.aggregate([
        { $match: paymentMatchCondition },
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
            source: { $literal: "direct" },
          },
        },
        {
          $project: {
            _id: 1,
            amount: 1,
            date: 1,
            customerName: 1,
            managerName: 1,
            notes: 1,
            source: 1,
          },
        },
      ]);

      // 2. Debtor collection'dan to'lovlarni olish
      let debtorMatchCondition: any = {
        "payment.isPaid": true,
        payment: { $exists: true },
      };

      if (customerId || contractId) {
        const { Debtor } = await import("../../schemas/debtor.schema");

        const debtorPayments = await Debtor.aggregate([
          { $match: debtorMatchCondition },
          {
            $lookup: {
              from: "contracts",
              localField: "contractId",
              foreignField: "_id",
              as: "contract",
            },
          },
          { $unwind: "$contract" },
          {
            $lookup: {
              from: "customers",
              localField: "contract.customer",
              foreignField: "_id",
              as: "customer",
            },
          },
          { $unwind: "$customer" },
          {
            $lookup: {
              from: "employees",
              localField: "payment.managerId",
              foreignField: "_id",
              as: "manager",
            },
          },
          { $unwind: "$manager" },
          {
            $lookup: {
              from: "notes",
              localField: "payment.notes",
              foreignField: "_id",
              as: "notes",
            },
          },
          {
            $match: customerId
              ? {
                  "customer._id": new (
                    await import("mongoose")
                  ).Types.ObjectId(customerId),
                }
              : contractId
              ? {
                  "contract._id": new (
                    await import("mongoose")
                  ).Types.ObjectId(contractId),
                }
              : {},
          },
          {
            $addFields: {
              _id: "$payment._id",
              amount: "$payment.amount",
              date: "$payment.date",
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
              source: { $literal: "debtor" },
            },
          },
          {
            $project: {
              _id: 1,
              amount: 1,
              date: 1,
              customerName: 1,
              managerName: 1,
              notes: 1,
              source: 1,
            },
          },
        ]);

        // Barcha to'lovlarni birlashtirish
        const allPayments = [...directPayments, ...debtorPayments];

        // Takrorlanishlarni olib tashlash va sanaga ko'ra saralash
        const uniquePayments = allPayments
          .filter(
            (payment, index, self) =>
              index ===
              self.findIndex(
                (p) => p._id?.toString() === payment._id?.toString()
              )
          )
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        console.log("Found payments:", {
          direct: directPayments.length,
          debtor: debtorPayments.length,
          total: uniquePayments.length,
        });

        return {
          status: "success",
          data: uniquePayments,
        };
      }

      // Agar filter yo'q bo'lsa, faqat direct payments
      const sortedPayments = directPayments.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      console.log("Found direct payments:", directPayments.length);

      return {
        status: "success",
        data: sortedPayments,
      };
    } catch (error) {
      console.error("Error in getPaymentHistory:", error);
      throw BaseError.InternalServerError("To'lovlar tarixini olishda xatolik");
    }
  }

  async update(payData: PayDebtDto, user: IJwtUser) {
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

    // To'lov qabul qilganda balansga qo'shamiz
    await this.addToBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    // Notes yaratish
    const notes = new Notes({
      text: payData.notes || `To'lov: ${payData.amount}`,
      customer,
      createBy: manager,
    });
    await notes.save();

    // Alohida Payment document yaratish (to'lovlar tarixi uchun)
    const paymentDoc = new (
      await import("../../schemas/payment.schema")
    ).default({
      amount: payData.amount,
      date: new Date(),
      isPaid: true,
      notes: notes._id,
      customerId: customer,
      managerId: manager._id,
    });
    await paymentDoc.save();

    // Shartnomaga to'lovni qo'shish
    const contract = await Contract.findById(existingDebtor.contractId._id);
    if (contract) {
      if (!contract.payments) {
        contract.payments = [];
      }
      (contract.payments as string[]).push(paymentDoc._id.toString());
      await contract.save();
    }

    // Debtor'da embedded payment yaratish
    const payment: IPayment = {
      amount: payData.amount,
      date: new Date(),
      isPaid: true,
      notes,
      customerId: customer,
      managerId: manager,
    };

    existingDebtor.payment = payment;
    existingDebtor.currencyDetails = payData.currencyDetails || {
      dollar: 0,
      sum: 0,
    };
    existingDebtor.currencyCourse = payData.currencyCourse || 12500;
    await existingDebtor.save();

    return {
      status: "success",
      message: "To'lov amalga oshirildi",
    };
  }

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

    // To'lov qabul qilganda balansga qo'shamiz
    await this.addToBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    // Notes yaratish
    const notes = new Notes({
      text: payData.notes || `To'lov: ${payData.amount}$`,
      customer: contract.customer,
      createBy: manager,
    });
    await notes.save();

    // Payment document yaratish
    const paymentDoc = new (
      await import("../../schemas/payment.schema")
    ).default({
      amount: payData.amount,
      date: new Date(),
      isPaid: true,
      notes: notes._id,
      customerId: contract.customer,
      managerId: manager._id,
    });
    await paymentDoc.save();

    // Shartnomaga to'lovni qo'shish
    if (!contract.payments) {
      contract.payments = [];
    }
    (contract.payments as string[]).push(paymentDoc._id.toString());
    await contract.save();

    console.log("✅ Payment added to contract:", {
      contractId: contract._id,
      paymentId: paymentDoc._id,
      amount: payData.amount,
      totalPayments: contract.payments.length,
    });

    return {
      status: "success",
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      contractId: contract._id,
    };
  }
}

export default new PaymentSrvice();
