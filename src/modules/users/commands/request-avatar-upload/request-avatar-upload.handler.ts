import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';

import { RequestAvatarUploadCommand } from './request-avatar-upload.command';
import { UsersService } from '../../users.service';

@CommandHandler(RequestAvatarUploadCommand)
export class RequestAvatarUploadHandler implements ICommandHandler<RequestAvatarUploadCommand> {
  constructor(private readonly usersService: UsersService) {}

  async execute(command: RequestAvatarUploadCommand): Promise<{ uploadUrl: string; key: string }> {
    const { userId, dto } = command;
    const ext = dto.contentType.split('/')[1];
    const key = `avatars/${userId}/${uuidv4()}.${ext}`;
    const uploadUrl = await this.usersService.generatePresignedUploadUrl(
      key,
      dto.contentType,
      dto.fileSizeBytes,
    );
    return { uploadUrl, key };
  }
}
