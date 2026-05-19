import { QueryUsersDto } from '../../dto/query-users.dto';

export class GetUsersQuery {
  constructor(
    public readonly requesterId: string,
    public readonly query: QueryUsersDto,
  ) {}
}
