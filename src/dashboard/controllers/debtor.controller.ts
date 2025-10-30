import { Request, Response, NextFunction } from "express";
import debtorService from "../services/debtor.service";

class DebtorController {
  async getDebtors(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await debtorService.getDebtors();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async getContract(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query;
      const data = await debtorService.getContract(
        startDate as string,
        endDate as string
      );
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async declareDebtors(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      console.log("body", req.body);

      const contractIds = req.body.contractIds;

      const data = await debtorService.declareDebtors(user, contractIds);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }
}

export default new DebtorController();
