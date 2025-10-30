import {
  IsString,
  IsNotEmpty,
  IsMongoId,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

class CurrencyDetailsDto {
  @IsNumber({}, { message: "Dollar qiymati raqam bo'lishi kerak" })
  @Min(0, { message: "Dollar qiymati manfiy bo'lmasligi kerak" })
  dollar: number;

  @IsNumber({}, { message: "So'm qiymati raqam bo'lishi kerak" })
  @Min(0, { message: "So'm qiymati manfiy bo'lmasligi kerak" })
  sum: number;
}

export class PayDto {
  @IsNumber({}, { message: "To'lov miqdori raqam bo'lishi kerak" })
  @Min(0, { message: "To'lov miqdori manfiy bo'lmasligi kerak" })
  amount: number;

  @IsString({ message: "Izoh matn bo'lishi kerak" })
  @IsOptional()
  notes?: string;

  @ValidateNested()
  @Type(() => CurrencyDetailsDto)
  currencyDetails: CurrencyDetailsDto;

  @IsNumber({}, { message: "Dollar kurs raqam bo'lishi kerak" })
  @Min(0, { message: "Dollar kurs manfiy bo'lmasligi kerak" })
  currencyCourse: number;
}

export class PayDebtDto extends PayDto {
  @IsMongoId({ message: "Debtor ID noto'g'ri" })
  @IsNotEmpty({ message: "Debtor ID bo'sh bo'lmasligi kerak" })
  id: string;
}

export class PayNewDebtDto extends PayDto {
  @IsMongoId({ message: "Contract ID noto'g'ri" })
  @IsNotEmpty({ message: "Contract ID bo'sh bo'lmasligi kerak" })
  id: string;
}
