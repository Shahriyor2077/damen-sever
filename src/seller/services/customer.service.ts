import BaseError from "../../utils/base.error";

import Auth from "../../schemas/auth.schema";
import Customer from "../../schemas/customer.schema";
import { CreateCustomerDtoForSeller } from "../validators/customer";

class CustomerService {
  async create(data: CreateCustomerDtoForSeller) {
    const customerNumber = await Customer.findOne({
      phoneNumber: data.phoneNumber,
    });
    const customerSeries = await Customer.findOne({
      passportSeries: data.passportSeries,
    });
    if (customerNumber) {
      throw BaseError.BadRequest(`Number already exist!`);
    }
    if (customerSeries) {
      throw BaseError.BadRequest(`Passport Series already exist!`);
    }
    const auth = new Auth({});
    await auth.save();
    const employee = new Customer({
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      passportSeries: data.passportSeries,
      birthDate: data.birthDate,
      auth,
    });
    await employee.save();
    return { message: "Mijoz qo'shildi." };
  }
}

export default new CustomerService();
