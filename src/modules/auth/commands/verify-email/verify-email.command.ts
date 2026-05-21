export class VerifyEmailCommand {
  constructor(
    public readonly token: string,
    public readonly registrationToken: string,
    public readonly ipAddress: string,
  ) {}
}
