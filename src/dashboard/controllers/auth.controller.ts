import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { plainToInstance } from "class-transformer";
import { LoginDto } from "../../validators/auth";
import { handleValidationErrors } from "../../validators/format";
import { validate } from "class-validator";
import BaseError from "../../utils/base.error";
import { profile } from "console";

class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const loginData = plainToInstance(LoginDto, req.body || {});

      const errors = await validate(loginData);

      if (errors.length > 0) {
        const formattedErrors = handleValidationErrors(errors);
        return next(
          BaseError.BadRequest(
            "Ma'lumotlar tekshiruvdan o'tmadi",
            formattedErrors
          )
        );
      }

      const data = await authService.login(loginData);

      res.cookie("refresh_token", data.refreshToken, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({ profile: data.profile, token: data.accessToken });
    } catch (error) {
      return next(error);
    }
  }

  async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user;
      if (user) {
        const data = await authService.getUser(user);
        res.json(data);
      }
    } catch (error) {
      return next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.cookies;
      const data = await authService.refresh(refresh_token);
      res.json(data);
    } catch (error) {
      return next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie("refresh_token");
      res.json({ message: "Log out" });
    } catch (error) {
      return next(error);
    }
  }
}
export default new AuthController();
