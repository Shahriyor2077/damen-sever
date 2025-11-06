import type { Request, Response, NextFunction } from "express";
import excelImportService from "../services/excel-import.service";
import BaseError from "../../utils/base.error";
import IJwtUser from "../../types/user";

class ExcelImportController {
  /**
   * Excel faylni upload qilish va import qilish
   */
  async importExcel(req: Request, res: Response, next: NextFunction) {
    try {
      console.log("📤 === EXCEL IMPORT CONTROLLER ===");

      // User tekshirish
      const user = req.user as IJwtUser;
      if (!user) {
        throw BaseError.UnauthorizedError();
      }

      // File tekshirish
      if (!req.file) {
        throw BaseError.BadRequest("Excel fayl yuklanmadi");
      }

      console.log("📁 File:", req.file.filename);
      console.log("📍 Path:", req.file.path);

      // Import qilish
      const result = await excelImportService.importFromExcel(
        req.file.path,
        user
      );

      // Response
      res.status(result.success ? 200 : 400).json({
        success: result.success,
        message: result.message,
        stats: result.stats,
        errors: result.errors,
      });
    } catch (error) {
      console.error("❌ Excel import controller error:", error);
      next(error);
    }
  }
}

export default new ExcelImportController();
