import Contract from "../../schemas/contract.schema";
import Customer from "../../schemas/customer.schema";
import BaseError from "../../utils/base.error";
import { CreateContractDtoForSeller } from "../validators/contract";
import { Balance } from "../../schemas/balance.schema";
import Employee from "../../schemas/employee.schema";

class ContractService {
  // Balansni yangilash funksiyasi
  async updateBalance(
    managerId: any,
    changes: {
      dollar?: number;
      sum?: number;
    }
  ) {
    const balance = await Balance.findOne({ managerId });

    if (!balance) {
      return await Balance.create({
        managerId,
        dollar: changes.dollar || 0,
        sum: changes.sum || 0,
      });
    }

    balance.dollar += changes.dollar || 0;
    balance.sum += changes.sum || 0;

    return await balance.save();
  }

  async create(data: CreateContractDtoForSeller, userId?: string) {
    const customer = await Customer.findById(data.customerId);
    if (!customer) {
      throw BaseError.NotFoundError(`Bunday mijoz topilmadi!`);
    }

    const contract = new Contract({
      customer: data.customerId,
      productName: data.productName,
      price: data.price,
      initialPayment: data.initialPayment || 0,
      notes: data.notes || "",
      currency: data.currency,
      initialPaymentDueDate: data.initialPaymentDueDate,
      startDate: new Date(),
    });
    await contract.save();

    // Initial payment balansga qo'shish (agar user ID mavjud bo'lsa)
    if (userId && data.initialPayment && data.initialPayment > 0) {
      await this.updateBalance(userId, {
        dollar: data.initialPayment,
        sum: 0,
      });
    }

    return { message: "Shartnoma qo'shildi." };
  }
  async post(data: any) {
    const contract = new Contract({ ...data });
    await contract.save();
    return { message: "Shartnoma qo'shildi." };
  }
}

export default new ContractService();
