import { Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { handleValidationErrors } from "../../validators/format";
import BaseError from "../../utils/base.error";
import { CreateContractDtoForSeller } from "../validators/contract";
import contractService from "../services/contract.service";

class CustomerController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const customerData = plainToInstance(
        CreateContractDtoForSeller,
        req.body || {}
      );
      const errors = await validate(customerData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("Shartnoma ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await contractService.create(customerData, req.user?.sub);
      res.status(201).json(data);
    } catch (error) {
      console.log("error", error);

      return next(error);
    }
  }
  async post(req: Request, res: Response, next: NextFunction) {
    try {
      const customerData: any = req.body;
      const data = await contractService.post(customerData);
      res.status(201).json(data);
    } catch (error) {
      console.log("error", error);

      return next(error);
    }
  }
}

export default new CustomerController();
