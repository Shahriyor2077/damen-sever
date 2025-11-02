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
      console.log("=== STATISTIC ENDPOINT CALLED ===");
      console.log("Query params:", req.query);

      // Test data - Oktyabr oyida 50 dollar to'lov
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

      // Database'dan haqiqiy ma'lumotlarni olish
      const Payment = (await import("../../schemas/payment.schema")).default;
      const dayjs = (await import("dayjs")).default;

      const now = new Date();
      const startDate = dayjs(now)
        .subtract(11, "month")
        .startOf("month")
        .toDate();

      console.log("Date range:", { startDate, now });

      // Payment collection'dan to'lovlarni olish
      const payments = await Payment.find({
        isPaid: true,
        date: { $gte: startDate },
      })
        .select("amount date")
        .lean();

      console.log("Found payments:", payments.length);
      console.log("Sample payments:", payments.slice(0, 3));

      // Bo'sh result yaratish
      const monthlyData = new Array(12).fill(0);

      // To'lovlarni oylarga bo'lib joylashtirish
      for (const payment of payments) {
        const paymentDate = dayjs(payment.date);
        const monthIndex = paymentDate.month(); // 0-11

        // Oxirgi 12 oy ichida bo'lsa
        const monthsAgo = dayjs(now).diff(paymentDate, "month");
        if (monthsAgo >= 0 && monthsAgo < 12) {
          const resultIndex = 11 - monthsAgo; // Reverse order
          monthlyData[resultIndex] += payment.amount;
        }
      }

      const result = {
        categories: monthNames,
        series: monthlyData,
      };

      console.log("Returning result:", result);
      res.status(200).json(result);
    } catch (error) {
      console.error("Statistic error:", error);
      res.status(500).json({ error: "Internal server error" });
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
