import { Schema, model, Document } from "mongoose";
import { IContract } from "./contract.schema";
import { IEmployee } from "./employee.schema";
import { IPayment } from "./payment.schema";

interface ICurrencyDetails {
  dollar: number;
  sum: number;
}

export interface IDebtor extends Document {
  contractId: IContract;
  debtAmount: number;
  createBy: IEmployee;
  payment?: IPayment;
  currencyDetails: ICurrencyDetails;
  currencyCourse: number;
}

const EmbeddedPaymentSchema = new Schema<IPayment>(
  {
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
  },
  { _id: false }
);

const CurrencyDetailsSchema = new Schema<ICurrencyDetails>(
  {
    dollar: { type: Number, required: true, default: 0 },
    sum: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const DebtorSchema = new Schema<IDebtor>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    debtAmount: { type: Number, required: true },
    createBy: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: false,
    },
    payment: { type: EmbeddedPaymentSchema, required: false },
    currencyDetails: { type: CurrencyDetailsSchema, required: false },
    currencyCourse: { type: Number, required: false },
  },
  { timestamps: true }
);

export const Debtor = model<IDebtor>("Debtor", DebtorSchema);
