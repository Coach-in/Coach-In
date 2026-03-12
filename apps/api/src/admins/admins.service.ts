import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from './entities/admin.entity';
import { User } from '../users/entities/user.entity';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
  ) {}

  async create(createAdminDto: CreateAdminDto, user: User): Promise<Admin> {
    const admin = this.adminRepository.create({ ...createAdminDto, user });
    return this.adminRepository.save(admin);
  }

  async findAll(): Promise<Admin[]> {
    return this.adminRepository.find();
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { id } });
    if (!admin) throw new NotFoundException(`Admin #${id} not found`);
    return admin;
  }

  async findMe(userId: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!admin)
      throw new NotFoundException(`Admin profile not found for user ${userId}`);
    return admin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findOne(id);
    return this.adminRepository.save({ ...admin, ...updateAdminDto });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.adminRepository.delete(id);
    return { message: `Admin ${id} deleted successfully` };
  }
}
