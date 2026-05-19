import { UpdateInterestsDto } from '../../dto/update-interests.dto';

export class UpdateInterestsCommand {
  constructor(
    public readonly userId: string,
    public readonly dto: UpdateInterestsDto,
  ) {}
}
