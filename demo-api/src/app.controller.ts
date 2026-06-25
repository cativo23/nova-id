import { Controller, Get } from "@nestjs/common";
import { Public } from "./decorators/public.decorator";

/**
 * AppController — public endpoints for demo-api.
 *
 * /health and /public are matched by the `api-test-public` Oathkeeper rule
 * (authenticator: noop, authorizer: allow) with strip_path:/api-test.
 * They must be @Public() so DemoAuthenticatedGuard bypasses JWT verification.
 */
@Controller()
export class AppController {
  @Get("health")
  @Public()
  getHealth() {
    return {
      status: "ok",
      service: "demo-api",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("public")
  @Public()
  getPublicData() {
    return {
      message: "Public endpoint — no authentication required",
      service: "demo-api",
      timestamp: new Date().toISOString(),
    };
  }
}
