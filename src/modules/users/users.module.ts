import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AppLogger } from '../../logger/app-logger.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, AppLogger],
  exports: [UsersService],
})
export class UsersModule {}
