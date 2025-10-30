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
    await this.updateBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    const notes = new Notes({
      text: payData.notes,
      customer,
      createBy: manager,
    });
    await notes.save();

    const payment: IPayment = {
      amount: payData.amount,
      date: new Date(),
      isPaid: true,
      notes,
      customerId: customer,
      managerId: manager,
    };

    existingDebtor.payment = payment;
    existingDebtor.currencyDetails = {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    };
    existingDebtor.currencyCourse = payData.currencyCourse;
    await existingDebtor.save();
    return {
      status: "success",
      message: "To'lov amalga oshirildi",
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
    await this.updateBalance(manager, {
      dollar: payData.currencyDetails?.dollar || 0,
      sum: payData.currencyDetails?.sum || 0,
    });

    const notes = new Notes({
      text: payData.notes,
      customer: customer,
      createBy: manager,
    });
    await notes.save();

    const payment: IPayment = {
      amount: payData.amount,
      date: new Date(),
      isPaid: true,
      notes,
      customerId: customer,
      managerId: manager,
    };

    const newDebtor = new Debtor({
      contractId: existingContract._id,
      debtAmount: existingContract.monthlyPayment,
      createBy: manager,
      payment,
      currencyDetails: {
        dollar: payData.currencyDetails?.dollar || 0,
        sum: payData.currencyDetails?.sum || 0,
      },
      currencyCourse: payData.currencyCourse,
    });
    await newDebtor.save();
    return {
      status: "success",
      message: "To'lov amalga oshirildi",
    };
  }
}

export default new PaymentSrvice();
