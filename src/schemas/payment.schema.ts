import { model, Schema } from "mongoose";
import { INotes } from "./notes.schema";
import { ICustomer } from "./customer.schema";
import { IEmployee } from "./employee.schema";

export interface IPayment {
  amount: number;
  date: Date;
  isPaid: boolean;
  notes: INotes;
  customerId: ICustomer;
  managerId: IEmployee;
}

const PaymentSchema = new Schema<IPayment>({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },

  isPaid: { type: Boolean, required: true, default: false },
  notes: {
    type: Schema.Types.ObjectId,
    ref: "Notes",
    required: true,
  },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
});

const Payment = model<IPayment>("Payment", PaymentSchema);

export default Payment;
