import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AppLogger } from '../../logger/app-logger.service';

import { UpdateProfileHandler } from './commands/update-profile/update-profile.handler';
import { UpdateInterestsHandler } from './commands/update-interests/update-interests.handler';
import { UpdateSecurityHandler } from './commands/update-security/update-security.handler';
import { RequestAvatarUploadHandler } from './commands/request-avatar-upload/request-avatar-upload.handler';
import { ConfirmAvatarHandler } from './commands/confirm-avatar/confirm-avatar.handler';

import { GetMyProfileHandler } from './queries/get-my-profile/get-my-profile.handler';
import { GetUsersHandler } from './queries/get-users/get-users.handler';
import { GetUserByIdHandler } from './queries/get-user-by-id/get-user-by-id.handler';

const CommandHandlers = [
  UpdateProfileHandler,
  UpdateInterestsHandler,
  UpdateSecurityHandler,
  RequestAvatarUploadHandler,
  ConfirmAvatarHandler,
];

const QueryHandlers = [
  GetMyProfileHandler,
  GetUsersHandler,
  GetUserByIdHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    AppLogger,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [UsersService],
})
export class UsersModule {}
