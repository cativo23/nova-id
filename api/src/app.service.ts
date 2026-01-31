import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getPublicData() {
    return {
      message: 'This is public data - no authentication required',
      timestamp: new Date().toISOString(),
      data: {
        version: '1.0.0',
        status: 'public',
        oryIntegration: 'API integrates with Ory Stack (Kratos, Keto, Hydra)',
      },
    };
  }

  getProtectedData(user: any) {
    return {
      message: 'This is protected data - requires authentication',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      data: {
        accessLevel: 'authenticated',
        message: 'You are logged in and can access this endpoint',
        verifiedBy: 'Kratos (user verified)',
      },
    };
  }

  getAdminDemoData(user: any) {
    return {
      message: 'Platform admin demo data',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      data: {
        accessLevel: 'platform_admin',
        message: 'You have platform_admin role',
        secret: 'Admin-level information',
        verifiedBy: 'RoleGuard (platform_admin)',
      },
    };
  }

  getUserDemoData(user: any) {
    return {
      message: 'Platform user demo data',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      data: {
        accessLevel: 'platform_user',
        message: 'You have platform_user role (or higher)',
        verifiedBy: 'AuthenticatedGuard',
      },
    };
  }

  createData(user: any, body: any) {
    return {
      message: 'Data created successfully',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      created: body,
      verifiedBy: 'Kratos (user verified)',
    };
  }

  updateData(user: any, id: string, body: any) {
    return {
      message: 'Data updated successfully',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      id,
      updated: body,
      verifiedBy: 'Kratos (user verified)',
    };
  }

  deleteData(user: any, id: string) {
    return {
      message: 'Data deleted successfully',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        role: user.role,
        authMethod: user.authMethod,
      },
      id,
      verifiedBy: 'Kratos (user verified)',
    };
  }

  getAppUserData(user: any) {
    return {
      message: 'App user data - any authenticated user with app_user or app_admin',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        appRole: user.appRole,
        authMethod: user.authMethod,
      },
      data: {
        accessLevel: 'app_user',
        message: 'You have app_user or app_admin role',
        verifiedBy: 'AuthenticatedGuard',
      },
    };
  }

  getAppAdminOnlyData(user: any) {
    return {
      message: 'App admin only - requires app_admin role',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        appRole: user.appRole,
        authMethod: user.authMethod,
      },
      data: {
        accessLevel: 'app_admin',
        message: 'You have app_admin role',
        secret: 'App-level admin information',
        verifiedBy: 'AppAdminGuard',
      },
    };
  }

  configureAppAdmin(user: any, body: any) {
    return {
      message: 'Configuration updated (app_admin)',
      timestamp: new Date().toISOString(),
      user: {
        id: user.userId,
        email: user.email,
        appRole: user.appRole,
      },
      configured: body,
      verifiedBy: 'AppAdminGuard',
    };
  }
}
