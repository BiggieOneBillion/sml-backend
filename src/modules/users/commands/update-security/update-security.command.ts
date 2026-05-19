import { UpdateSecurityDto } from '../../dto/update-security.dto';

export class UpdateSecurityCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: UpdateSecurityDto,
  ) {}
}
