import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsNumber,
  Min,
  IsEnum,
  IsDateString,
} from "class-validator";

export class CreateContractDtoForSeller {
  [x: string]: any;
  @IsMongoId({ message: "Mijoz id noto‘g‘ri MongoId formatida bo‘lishi kerak" })
  @IsNotEmpty({ message: "Mijoz id bo'sh bo'lmasligi kerak" })
  customerId: string;

  @IsString({ message: "Maxsulot nomi satr bo'lishi kerak" })
  @IsNotEmpty({ message: "Maxsulot nomi bo'sh bo'lmasligi kerak" })
  productName: string;

  @IsNumber({}, { message: "Narx raqam bo'lishi kerak" })
  @Min(0, { message: "Narx manfiy bo'lmasligi kerak" })
  price: number;

  @IsNumber({}, { message: "Oldindan to'lov raqam bo'lishi kerak" })
  @Min(0, { message: "Oldindan to'lov manfiy bo'lmasligi kerak" })
  initialPayment: number;

  @IsString({ message: "Izoh satr bo'lishi kerak" })
  notes: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: "Tug'ilgan sana ISO formatda bo'lishi kerak (YYYY-MM-DD)" }
  )
  initialPaymentDueDate?: string;
}
