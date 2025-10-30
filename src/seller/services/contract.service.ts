import Contract from "../../schemas/contract.schema";
import Customer from "../../schemas/customer.schema";
import BaseError from "../../utils/base.error";
import { CreateContractDtoForSeller } from "../validators/contract";

class ContractService {
  async create(data: CreateContractDtoForSeller) {
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
    return { message: "Shartnoma qo'shildi." };
  }
  async post(data: any) {
    const contract = new Contract({ ...data });
    await contract.save();
    return { message: "Shartnoma qo'shildi." };
  }
}

export default new ContractService();
