import { Request, Response, NextFunction } from "express";
import dashboardService from "../services/dashboard.service";
import BaseError from "../../utils/base.error";

class DashboardController {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.dashboard();
      res.status(201).json(data);
    } catch (error) {
      return next(error);
    }
  }
  async statistic(req: Request, res: Response, next: NextFunction) {
    try {
      const range = req.query.range || "monthly"; // default monthly
      const data = await dashboardService.statistic(range as string);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async currencyCourse(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.currencyCourse();
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }

  async changeCurrency(req: Request, res: Response, next: NextFunction) {
    try {
      const { currency } = req.body;
      if (!currency) {
        return next(BaseError.BadRequest("Ma'lumotlari xato."));
      }
      const data = await dashboardService.changeCurrency(currency);
      res.status(200).json(data);
    } catch (error) {
      return next(error);
    }
  }
}
export default new DashboardController();
