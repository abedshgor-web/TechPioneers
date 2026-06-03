import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({ example: 'john@acmecorp.com' })
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password!: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName!: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName!: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  @Transform(({ value }: { value: string }) => value?.trim())
  companyName!: string;
}
