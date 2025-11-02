import BaseError from "../../utils/base.error";
import Auth from "../../schemas/auth.schema";
import Customer from "../../schemas/customer.schema";
import Employee from "../../schemas/employee.schema";
import { CreateCustomerDtoForSeller } from "../validators/customer";
import IJwtUser from "../../types/user";
import { Types } from "mongoose";

class CustomerService {
  // Barcha yangi mijozlarni ko'rish
  async getAllNew(userId: string) {
    const query: any = {
      isDeleted: false,
      isActive: false,
    };
    const customers = await Customer.find(query).sort({ createdAt: -1 });
    return customers;
  }

  async create(data: CreateCustomerDtoForSeller, user: IJwtUser, files?: any) {
    const createBy = await Employee.findById(user.sub);
    if (!createBy) {
      throw BaseError.ForbiddenError();
    }

    if (data.phoneNumber) {
      const customerNumber = await Customer.findOne({
        phoneNumber: data.phoneNumber,
      });
      if (customerNumber) {
        throw BaseError.BadRequest(
          "Ushbu telefon raqami bilan mijoz allaqachon mavjud."
        );
      }
    }

    if (data.passportSeries) {
      const customerSeries = await Customer.findOne({
        passportSeries: data.passportSeries,
      });
      if (customerSeries) {
        throw BaseError.BadRequest(
          "Ushbu passport seriyasi bilan mijoz allaqachon mavjud."
        );
      }
    }

    const auth = new Auth({});
    await auth.save();

    // File paths
    const customerFiles: any = {};
    if (files) {
      if (files.passport && files.passport[0]) {
        customerFiles.passport = files.passport[0].path;
      }
      if (files.shartnoma && files.shartnoma[0]) {
        customerFiles.shartnoma = files.shartnoma[0].path;
      }
      if (files.photo && files.photo[0]) {
        customerFiles.photo = files.photo[0].path;
      }
    }

    const customer = new Customer({
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      passportSeries: data.passportSeries,
      birthDate: data.birthDate,
      auth,
      isActive: false,
      createBy,
      files: customerFiles,
    });
    await customer.save();
    return { message: "Mijoz yaratildi.", customer };
  }
}

export default new CustomerService();
