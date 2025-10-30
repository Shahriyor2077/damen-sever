import BaseError from "../../utils/base.error";
import bcrypt from "bcrypt";
import { LoginDto } from "../../validators/auth";
import Employee from "../../schemas/employee.schema";
import IJwtUser from "../../types/user";
import jwt from "../../utils/jwt";
import IEmployeeData from "../../types/employeeData";

class AuthService {
  async login(data: LoginDto) {
    const { phoneNumber, password } = data;
    const employee = await Employee.findOne({ phoneNumber })
      .populate("auth")
      .populate("role");

    if (!employee) {
      throw BaseError.BadRequest("parol yoki telefon raqam xato!");
    }

    const authEmployee = employee.auth;

    if (authEmployee.isBlocked) {
      if (authEmployee.blockExpires && new Date() < authEmployee.blockExpires) {
        throw BaseError.BadRequest(
          "Hisobga kirish uchun juda ko`p urinish, keyinroq qayta urinib ko'ring."
        );
      } else {
        authEmployee.isBlocked = false;
        authEmployee.attemptCount = 0;
        authEmployee.blockExpires = null;
        await authEmployee.save();
      }
    }

    const isMatched = await bcrypt.compare(
      data.password,
      authEmployee.password || ""
    );

    if (!isMatched) {
      authEmployee.attemptCount += 1;
      await authEmployee.save();
      if (authEmployee.attemptCount >= 3) {
        authEmployee.isBlocked = true;
        authEmployee.blockExpires = new Date(Date.now() + 10 * 60 * 1000);
        await authEmployee.save();
        throw BaseError.BadRequest(
          "Hisobga kirish uchun juda ko`p urinish, keyinroq qayta urinib ko'ring."
        );
      }
      throw BaseError.BadRequest("parol yoki username xato");
    }

    authEmployee.attemptCount = 0;
    authEmployee.isBlocked = false;
    authEmployee.blockExpires = null;
    await authEmployee.save();

    const employeeData: IEmployeeData = {
      id: employee.id,
      firstname: employee.firstName,
      lastname: employee.lastName,
      phoneNumber: employee.phoneNumber,
      telegramId: employee.telegramId,
      role: employee.role.name,
    };

    const employeeDto: IJwtUser = {
      sub: employee.id.toString(),
      name: employee.firstName,
      role: employee.role.name,
    };
    const token = jwt.sign(employeeDto);
    return { profile: employeeData, ...token };
  }

  async getUser(token: IJwtUser) {
    const employee = await Employee.findById(token.sub).populate("role");
    if (!employee) {
      throw BaseError.UnauthorizedError();
    }
    const userData: IEmployeeData = {
      id: employee.id,

      firstname: employee.firstName,
      lastname: employee.lastName,
      phoneNumber: employee.phoneNumber,
      telegramId: employee.telegramId,
      role: employee.role.name,
    };

    return { profile: userData };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw BaseError.UnauthorizedError();
    }
    const userPayload = jwt.validateRefreshToken(refreshToken);
    if (!userPayload) {
      throw BaseError.UnauthorizedError();
    }
    const employee = await Employee.findById(userPayload.sub).populate("role");
    if (!employee) {
      throw BaseError.BadRequest("User not found");
    }
    const employeeData: IEmployeeData = {
      id: employee.id,
      firstname: employee.firstName,
      lastname: employee.lastName,
      phoneNumber: employee.phoneNumber,
      telegramId: employee.telegramId,
      role: employee.role.name,
    };

    const employeeDto: IJwtUser = {
      sub: employee.id.toString(),
      name: employee.firstName,
      role: employee.role.name,
    };
    const accessToken = jwt.signrefresh(employeeDto);
    return { profile: employeeData, accessToken };
  }
}

export default new AuthService();
