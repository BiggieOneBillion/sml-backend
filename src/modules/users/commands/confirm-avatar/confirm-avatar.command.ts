import { ConfirmAvatarDto } from '../../dto/avatar.dto';

export class ConfirmAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: ConfirmAvatarDto,
  ) {}
}
