import Employee, { IEmployee } from "../../schemas/employee.schema";
import IJwtUser from "../../types/user";
import { IPayment } from "../../schemas/payment.schema";
import { Debtor } from "../../schemas/debtor.schema";
import BaseError from "../../utils/base.error";
import { PayDebtDto } from "../../validators/payment";
import Notes from "../../schemas/notes.schema";
import { Balance } from "../../schemas/balance.schema";

class PaymentSrvice {
  async subtractFromBalance(
    managerId: IEmployee,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    const balance = await Balance.findOne({ managerId });

    // if (!balance) {
    //   throw BaseError.NotFoundError("Menejerning balansi topilmadi");
    // }

    // balance.dollar -= changes.dollar || 0;
    // balance.sum -= changes.sum || 0;

    // return await balance.save();

    if (balance) {
      balance.dollar -= changes.dollar || 0;
      balance.sum -= changes.sum || 0;

      return await balance.save();
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

    const oldCurrency = existingDebtor.currencyDetails || {
      dollar: 0,
      sum: 0,
    };

    const newCurrency = payData.currencyDetails || {
      dollar: 0,
      sum: 0,
    };

    await this.subtractFromBalance(manager, {
      dollar: oldCurrency.dollar - newCurrency.dollar,
      sum: oldCurrency.sum - newCurrency.sum,
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
    existingDebtor.currencyDetails = newCurrency;
    existingDebtor.currencyCourse = payData.currencyCourse;
    await existingDebtor.save();

    return {
      status: "success",
      message: "To'lov amalga oshirildi",
    };
  }
}

export default new PaymentSrvice();
