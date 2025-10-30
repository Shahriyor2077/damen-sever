import { Request, Response, NextFunction } from "express";
import Employee from "../schemas/employee.schema";
import BaseError from "../utils/base.error";
import jwt from "../utils/jwt";
// import { RoleEnum } from "../enums/role.enum";

export const botManager = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) {
      return next(BaseError.UnauthorizedError());
    }
    const accressToken = auth.split(" ")[1];
    if (!accressToken) {
      return next(BaseError.UnauthorizedError());
    }
    const userData = jwt.validateAccessToken(accressToken);
    if (!userData) {
      return next(BaseError.UnauthorizedError());
    }

    const user = await Employee.findById(userData.sub).populate("role").exec();

    if (!user) return next(BaseError.UnauthorizedError());

    const userRole = user.role?.name;
    console.log("userRole", userRole);

    if (userRole !== "manager") {
      return next(BaseError.ForbiddenError());
    }

    req.user = userData;
    return next();
  } catch (error) {
    return next(BaseError.UnauthorizedError());
  }
};
