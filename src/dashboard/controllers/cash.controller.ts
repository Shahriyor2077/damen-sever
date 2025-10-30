import { Request, Response, NextFunction } from "express";
import cashService from "../services/cash.service";

class CashController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cashService.getAll();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async confirmations(req: Request, res: Response, next: NextFunction) {
    try {
      const { cashIds } = req.body;
      const data = await cashService.confirmations(cashIds);
      res.status(200).json(data);
    } catch (error) {
      console.log("err", error);

      return next(error);
    }
  }
}

export default new CashController();
