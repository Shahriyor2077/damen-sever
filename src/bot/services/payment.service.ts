import Contract from "../../schemas/contract.schema";
import Employee, { IEmployee } from "../../schemas/employee.schema";
import IJwtUser from "../../types/user";
import { IPayment } from "../../schemas/payment.schema";
import { Debtor } from "../../schemas/debtor.schema";
import BaseError from "../../utils/base.error";
import { PayDebtDto, PayNewDebtDto } from "../../validators/payment";
import Notes from "../../schemas/notes.schema";
import { Balance } from "../../schemas/balance.schema";

class PaymentSrvice {
  async updateBalance(
    managerId: IEmployee,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    const balance = await Balance.findOne({ managerId });

    if (!balance) {
      return await Balance.create({
        managerId,
        ...changes,
      });
    }

    balance.dollar += changes.dollar || 0;
    balance.sum += changes.sum || 0;

    return await balance.save();
  }

  async payDebt(payData: PayDebtDto, user: IJwtUser) {
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

    const notes = new Notes({
      text: payData.notes,
      customer,
      createBy: manager,
    });
    await notes.save();

    // ✅ YANGI LOGIKA - To'lovlar PAID status bilan yaratiladi (avtomatik tasdiqlangan)
    const Payment = (await import("../../schemas/payment.schema")).default;
    const { PaymentType, PaymentStatus } = await import(
      "../../schemas/payment.schema"
    );

    const paymentDoc = await Payment.create({
      amount: payData.amount,
      date: new Date(),
      isPaid: true, // ✅ Avtomatik tasdiqlangan
      paymentType: PaymentType.MONTHLY,
      notes: notes._id,
      customerId: customer,
      managerId: manager._id,
      status: PaymentStatus.PAID, // ✅ PAID status
      confirmedAt: new Date(),
      confirmedBy: manager._id,
    });

    console.log("✅ Payment created (PAID):", paymentDoc._id);

    // Contract.payments ga qo'shish
    const Contract = (await import("../../schemas/contract.schema")).default;
    await Contract.findByIdAndUpdate(existingDebtor.contractId._id, {
      $push: { payments: paymentDoc._id },
    });

    // Balance yangilash
    await this.updateBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    // Debtor o'chirish
    await existingDebtor.deleteOne();

    return {
      status: "success",
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      paymentId: paymentDoc._id,
    };
  }

  async payNewDebt(payData: PayNewDebtDto, user: IJwtUser) {
    const existingContract = await Contract.findById(payData.id);

    if (!existingContract) {
      throw BaseError.NotFoundError("Shartnoma topilmadi yoki o'chirilgan");
    }
    const customer = existingContract.customer;
    const manager = await Employee.findById(user.sub);

    if (!manager) {
      throw BaseError.NotFoundError("Menejer topilmadi yoki o'chirilgan");
    }

    const notes = new Notes({
      text: payData.notes,
      customer: customer,
      createBy: manager,
    });
    await notes.save();

    // ✅ YANGI LOGIKA - To'lovlar PAID status bilan yaratiladi (avtomatik tasdiqlangan)
    const Payment = (await import("../../schemas/payment.schema")).default;
    const { PaymentType, PaymentStatus } = await import(
      "../../schemas/payment.schema"
    );

    const paymentDoc = await Payment.create({
      amount: payData.amount,
      date: new Date(),
      isPaid: true, // ✅ Avtomatik tasdiqlangan
      paymentType: PaymentType.MONTHLY,
      notes: notes._id,
      customerId: customer,
      managerId: manager._id,
      status: PaymentStatus.PAID, // ✅ PAID status
      confirmedAt: new Date(),
      confirmedBy: manager._id,
    });

    console.log("✅ Payment created (PAID):", paymentDoc._id);

    // Contract.payments ga qo'shish
    if (!existingContract.payments) {
      existingContract.payments = [];
    }
    (existingContract.payments as string[]).push(paymentDoc._id.toString());
    await existingContract.save();

    // Balance yangilash
    await this.updateBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    return {
      status: "success",
      message: "To'lov muvaffaqiyatli amalga oshirildi",
      paymentId: paymentDoc._id,
    };
  }
}

export default new PaymentSrvice();
