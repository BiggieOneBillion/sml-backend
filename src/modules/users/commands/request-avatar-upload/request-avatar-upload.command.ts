import { RequestAvatarUploadDto } from '../../dto/avatar.dto';

export class RequestAvatarUploadCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: RequestAvatarUploadDto,
  ) {}
}
