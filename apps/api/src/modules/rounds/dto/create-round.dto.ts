import { IsOptional, IsInt, Min, IsEnum, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { TableGenerationMode } from '@catan/shared';

export class ManualTableDto {
  @IsInt()
  @Min(1)
  tableNumber: number;

  @IsArray()
  @ArrayMinSize(3)
  playerIds: string[];
}

export class GenerateTablesQueryDto {
  @IsEnum(TableGenerationMode)
  mode: TableGenerationMode;
}

export class ManualAssignmentDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualTableDto)
  tables?: ManualTableDto[];
}
