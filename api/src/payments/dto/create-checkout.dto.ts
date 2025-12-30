import { IsString, IsUrl, IsOptional } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  priceId: string;

  @IsUrl()
  successUrl: string;

  @IsUrl()
  cancelUrl: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}
