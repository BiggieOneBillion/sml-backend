export class GetUserByIdQuery {
  constructor(
    public readonly requesterId: string,
    public readonly targetId: string,
  ) {}
}
