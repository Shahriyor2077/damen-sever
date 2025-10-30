import { Document, Schema, model } from "mongoose";

export interface IAuth extends Document {
  password: string;
  attemptCount: number;
  isBlocked: boolean;
  blockExpires: Date | null;
}

const AuthSchema: Schema<IAuth> = new Schema<IAuth>(
  {
    password: { type: String },
    attemptCount: {
      type: Number,
      required: false,
      default: 0,
    },
    isBlocked: {
      type: Boolean,
      required: false,
      default: false,
    },
    blockExpires: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Auth = model<IAuth>("Auth", AuthSchema);

export default Auth;
