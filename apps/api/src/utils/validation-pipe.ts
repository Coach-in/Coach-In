import { ValidationPipe } from '@nestjs/common';

// whitelist strips every body field that has no class-validator decorator on
// the DTO, so clients cannot mass-assign entity columns such as
// `coach.isApproved` or `user.role`. Unknown fields are dropped silently
// (not rejected) to stay compatible with existing web/mobile payloads.
// forbidUnknownValues is disabled so DTOs without any decorator (e.g.
// CreateAdminDto) are accepted as empty objects instead of rejected.
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidUnknownValues: false,
  });
}
