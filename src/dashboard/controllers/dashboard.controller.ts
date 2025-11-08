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
      const monthNames = [
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
      ];

      const Payment = (await import("../../schemas/payment.schema")).default;
      const dayjs = (await import("dayjs")).default;

      const now = new Date();
      const startDate = dayjs(now)
        .subtract(11, "month")
        .startOf("month")
        .toDate();

      const payments = await Payment.find({
        isPaid: true,
        date: { $gte: startDate },
      })
        .select("amount date")
        .lean();

      const monthlyData = new Array(12).fill(0);

      for (const payment of payments) {
        const paymentDate = dayjs(payment.date);
        const monthIndex = paymentDate.month();

        const monthsAgo = dayjs(now).diff(paymentDate, "month");
        if (monthsAgo >= 0 && monthsAgo < 12) {
          const resultIndex = 11 - monthsAgo;
          monthlyData[resultIndex] += payment.amount;
        }
      }

      const result = {
        categories: monthNames,
        series: monthlyData,
      };

      res.status(200).json(result);
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
