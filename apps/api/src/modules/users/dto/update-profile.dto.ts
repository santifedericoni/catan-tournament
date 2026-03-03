import { IsString, IsOptional, MaxLength, MinLength, IsIn } from 'class-validator';

const VALID_COLORS = ['Red', 'Blue', 'White', 'Orange', 'Green', 'Brown'];
const VALID_EXPANSIONS = ['Base', 'Seafarers', 'Cities & Knights', 'Traders & Barbarians'];

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  alias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_COLORS)
  favoriteColor?: string;

  @IsOptional()
  @IsString()
  @IsIn(VALID_EXPANSIONS)
  favoriteExpansion?: string;
}
