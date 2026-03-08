import {IsNotEmpty, IsEmail, MinLength} from 'class-validator'

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsNotEmpty()
    username: string;

    @MinLength(8)
    password: string;
}
