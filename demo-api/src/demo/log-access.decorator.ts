import { SetMetadata } from "@nestjs/common";

export const LOG_ACCESS_KEY = "logAccess";
export const LogAccess = () => SetMetadata(LOG_ACCESS_KEY, true);
