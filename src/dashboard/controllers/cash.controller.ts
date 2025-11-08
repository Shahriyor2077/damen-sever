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
      const user = req.user;
      const { cashIds } = req.body;
      const data = await cashService.confirmations(cashIds, user);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  // Yangi endpoint'lar
  async getPendingPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await cashService.getPendingPayments();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async confirmPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { paymentIds } = req.body;
      const data = await cashService.confirmPayments(paymentIds, user);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async rejectPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      const { paymentId, reason } = req.body;
      const data = await cashService.rejectPayment(paymentId, reason, user);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }
}

export default new CashController();
