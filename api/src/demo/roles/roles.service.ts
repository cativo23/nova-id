import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from './entities/user-role.entity';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) { }

  /**
   * Ensures a user exists in the app database with default app_user role.
   * Called automatically when a user authenticates for the first time.
   */
  async ensureUserExists(userId: string): Promise<UserRole> {
    let userRole = await this.userRoleRepository.findOne({
      where: { userId },
    });

    if (!userRole) {
      this.logger.log(`Creating new app user: ${userId} with role app_user`);
      userRole = this.userRoleRepository.create({
        userId,
        appRole: 'app_user',
      });
      userRole = await this.userRoleRepository.save(userRole);
    }

    return userRole;
  }

  async getAppRole(userId: string, ensureExists: boolean = true): Promise<'app_admin' | 'app_user'> {
    let userRole = await this.userRoleRepository.findOne({
      where: { userId },
    });

    // If user doesn't exist and ensureExists is true, create them with app_user role
    if (!userRole && ensureExists) {
      userRole = await this.ensureUserExists(userId);
    }

    return userRole?.appRole || 'app_user'; // Default to app_user
  }

  async setAppRole(userId: string, appRole: 'app_admin' | 'app_user'): Promise<UserRole> {
    let userRole = await this.userRoleRepository.findOne({
      where: { userId },
    });

    if (userRole) {
      userRole.appRole = appRole;
      return await this.userRoleRepository.save(userRole);
    } else {
      userRole = this.userRoleRepository.create({ userId, appRole });
      return await this.userRoleRepository.save(userRole);
    }
  }

  async getAllUserRoles(): Promise<UserRole[]> {
    return await this.userRoleRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async getUserRole(userId: string): Promise<UserRole | null> {
    return await this.userRoleRepository.findOne({
      where: { userId },
    });
  }

  async deleteUserRole(userId: string): Promise<void> {
    const result = await this.userRoleRepository.delete({ userId });
    if (result.affected === 0) {
      throw new NotFoundException(`User role for userId ${userId} not found`);
    }
  }
}
