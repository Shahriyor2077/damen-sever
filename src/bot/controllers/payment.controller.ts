import { Request, Response, NextFunction } from "express";
import BaseError from "../../utils/base.error";
import IJwtUser from "../../types/user";
import { RoleEnum } from "../../enums/role.enum";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PayDebtDto, PayNewDebtDto } from "../../validators/payment";
import { handleValidationErrors } from "../../validators/format";
import paymentService from "../services/payment.service";

// const user: IJwtUser = {
//   sub: "686e7881ab577df7c3eb3db2",
//   name: "Farhod",
//   role: RoleEnum.MANAGER,
// };

class PaymentController {
  async payDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const payData = plainToInstance(PayDebtDto, req.body || {});
      const errors = await validate(payData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("To'lov ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await paymentService.payDebt(payData, user);
      res.status(201).json(data);
    } catch (error) {
      return next(error);
    }
  }
  async payNewDebt(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const payData = plainToInstance(PayNewDebtDto, req.body || {});
      const errors = await validate(payData);
      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest("To'lov ma'lumotlari xato.", formattedErrors)
        );
      }
      const data = await paymentService.payNewDebt(payData, user);
      res.status(201).json(data);
    } catch (error) {
      console.log("error", error);

      return next(error);
    }
  }
}
export default new PaymentController();
