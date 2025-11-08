import { Request, Response, NextFunction } from "express";
import Employee from "../schemas/employee.schema";
import BaseError from "../utils/base.error";
import jwt from "../utils/jwt";
// import { RoleEnum } from "../enums/role.enum";

export const checkPermission = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // const userId = req.user?.sub;
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
      req.user = userData;

      const user = await Employee.findById(userData.sub)
        .populate("role")
        .exec();

      if (!user) return next(BaseError.UnauthorizedError());

      const userRole = user.role?.name;

      if (userRole === "admin" || userRole === "moderator") {
        return next();
      }

      // const rolePermissions =
      //   (user.role as any)?.permissions?.map((p: any) => p.name) || [];
      // const userPermissions =
      //   (user.permissions as any)?.map((p: any) => p.name) || [];
      // Role permissions - agar role.permissions string[] bo'lsa:
      const rolePermissions: string[] = Array.isArray(user.role?.permissions)
        ? user.role!.permissions.map((p: any) =>
            typeof p === "string" ? p : p.name
          )
        : [];

      // User permissions - bu ham string[] bo'lishi kerak:
      const userPermissions: string[] = Array.isArray(user.permissions)
        ? user.permissions.map((p) => p)
        : [];

      const allPermissions = new Set([...rolePermissions, ...userPermissions]);

      if (!allPermissions.has(requiredPermission)) {
        return next(BaseError.ForbiddenError());
      }

      next();
    } catch (error) {
      return next(BaseError.UnauthorizedError());
    }
  };
};
