import { Schema, model, Types } from "mongoose";
import { BaseSchema, IBase } from "./base.schema";
import { ICustomer } from "./customer.schema";
import { IPayment } from "./payment.schema";
import { INotes } from "./notes.schema";

export interface IContractInfo {
  box: boolean;
  mbox: boolean;
  receipt: boolean;
  iCloud: boolean;
}

export const ContractInfoSchema = new Schema<IContractInfo>(
  {
    box: { type: Boolean, default: false },
    mbox: { type: Boolean, default: false },
    receipt: { type: Boolean, default: false },
    iCloud: { type: Boolean, default: false },
  },
  { _id: false }
);

export enum ContractStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export interface IContract extends IBase {
  startDate: Date;
  initialPaymentDueDate?: Date;
  nextPaymentDate: Date;
  customer: ICustomer;
  productName: string;
  originalPrice: number;
  price: number;
  initialPayment: number;
  period: number;
  monthlyPayment: number;
  totalPrice: number;
  percentage?: number;
  notes: INotes;
  info: IContractInfo;

  isDeclare: boolean;
  status: ContractStatus;
  payments: IPayment[] | string[];
}

const ContractSchema = new Schema<IContract>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    productName: { type: String, required: true },
    originalPrice: { type: Number, required: true },
    price: { type: Number, required: true },
    initialPayment: { type: Number, required: true },
    percentage: { type: Number, default: 30 },
    period: { type: Number, required: false },
    initialPaymentDueDate: { type: Date, required: false },
    monthlyPayment: { type: Number },
    notes: {
      type: Schema.Types.ObjectId,
      ref: "Notes",
      required: true,
    },
    totalPrice: { type: Number, required: false },
    startDate: { type: Date, required: true },
    nextPaymentDate: { type: Date, required: false },
    status: {
      type: String,
      enum: Object.values(ContractStatus),
      default: ContractStatus.ACTIVE,
    },

    payments: [
      {
        type: Schema.Types.ObjectId,
        ref: "Payment",
        required: false,
      },
    ],

    info: { type: ContractInfoSchema, required: false },
    isDeclare: {
      type: Boolean,
      default: false,
    },
    ...BaseSchema,
  },
  {
    timestamps: true,
  }
);

const Contract = model<IContract>("Contract", ContractSchema);

export default Contract;
