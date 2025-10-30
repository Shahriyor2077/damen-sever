import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { handleValidationErrors } from "../../validators/format";
import BaseError from "../../utils/base.error";
import customerService from "../services/customer.service";
import { CreateCustomerDtoForSeller } from "../validators/customer";

class CustomerController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customerData = plainToInstance(
        CreateCustomerDtoForSeller,
        req.body || {}
      );
      const errors = await validate(customerData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Mijoz ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await customerService.create(customerData);
      res.status(201).json(data);
    } catch (error) {
      console.log("error", error);

      return next(error);
    }
  }
}

export default new CustomerController();
