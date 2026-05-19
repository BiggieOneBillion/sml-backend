import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Body,
  Query,
  Param,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { UpdateProfileSchema, UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateInterestsSchema, UpdateInterestsDto } from './dto/update-interests.dto';
import { UpdateSecuritySchema, UpdateSecurityDto } from './dto/update-security.dto';
import { QueryUsersSchema, QueryUsersDto } from './dto/query-users.dto';
import {
  RequestAvatarUploadSchema,
  RequestAvatarUploadDto,
  ConfirmAvatarSchema,
  ConfirmAvatarDto,
} from './dto/avatar.dto';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt-access.strategy';

import { GetMyProfileQuery } from './queries/get-my-profile/get-my-profile.query';
import { GetUsersQuery } from './queries/get-users/get-users.query';
import { GetUserByIdQuery } from './queries/get-user-by-id/get-user-by-id.query';
import { UpdateProfileCommand } from './commands/update-profile/update-profile.command';
import { UpdateInterestsCommand } from './commands/update-interests/update-interests.command';
import { UpdateSecurityCommand } from './commands/update-security/update-security.command';
import { RequestAvatarUploadCommand } from './commands/request-avatar-upload/request-avatar-upload.command';
import { ConfirmAvatarCommand } from './commands/confirm-avatar/confirm-avatar.command';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  // ── Own Profile ───────────────────────────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get own full profile' })
  getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.queryBus.execute(new GetMyProfileQuery(user.sub));
  }

  @Patch('me')
  @UsePipes(new ZodValidationPipe(UpdateProfileSchema))
  @ApiOperation({ summary: 'Update own profile (any field is optional)' })
  updateMyProfile(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto) {
    return this.commandBus.execute(new UpdateProfileCommand(user.sub, dto));
  }

  @Put('me/interests')
  @UsePipes(new ZodValidationPipe(UpdateInterestsSchema))
  @ApiOperation({ summary: 'Replace all interests (min 1, max 10)' })
  updateInterests(@CurrentUser() user: JwtPayload, @Body() dto: UpdateInterestsDto) {
    return this.commandBus.execute(new UpdateInterestsCommand(user.sub, dto));
  }

  @Patch('me/security')
  @UsePipes(new ZodValidationPipe(UpdateSecuritySchema))
  @ApiOperation({ summary: 'Toggle 2FA on/off' })
  updateSecurity(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSecurityDto) {
    return this.commandBus.execute(new UpdateSecurityCommand(user.sub, dto));
  }

  // ── Avatar Upload ─────────────────────────────────────────────────────────

  @Post('me/avatar/upload-url')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RequestAvatarUploadSchema))
  @ApiOperation({ summary: 'Get a pre-signed S3 URL for avatar upload (15-min expiry)' })
  requestAvatarUpload(@CurrentUser() user: JwtPayload, @Body() dto: RequestAvatarUploadDto) {
    return this.commandBus.execute(new RequestAvatarUploadCommand(user.sub, dto));
  }

  @Patch('me/avatar')
  @UsePipes(new ZodValidationPipe(ConfirmAvatarSchema))
  @ApiOperation({ summary: 'Confirm avatar by providing the final S3/CloudFront URL' })
  confirmAvatar(@CurrentUser() user: JwtPayload, @Body() dto: ConfirmAvatarDto) {
    return this.commandBus.execute(new ConfirmAvatarCommand(user.sub, dto));
  }

  // ── Public Discovery ──────────────────────────────────────────────────────
  // NOTE: @Get('me') MUST be defined before @Get(':id') so NestJS/Express
  // matches the static segment first.

  @Get()
  @UsePipes(new ZodValidationPipe(QueryUsersSchema))
  @ApiOperation({ summary: 'Discover users (Strategic Partners). Premium users see full detail.' })
  getUsers(@CurrentUser() user: JwtPayload, @Query() query: QueryUsersDto) {
    return this.queryBus.execute(new GetUsersQuery(user.sub, query));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by user ID. Own ID returns full detail.' })
  getUserById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.queryBus.execute(new GetUserByIdQuery(user.sub, id));
  }
}
