import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { BusinessRuleException } from '../../common/exceptions/app.exceptions';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async isUserPremium(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    return sub?.status === SubscriptionStatus.ACTIVE;
  }

  validateAvatarUrl(url: string): void {
    const { publicBucket, cloudfrontUrl } = this.config.s3;
    const region = this.config.aws.region;

    const allowed = [
      `https://${publicBucket}.s3.${region}.amazonaws.com/avatars/`,
      `https://${publicBucket}.s3.amazonaws.com/avatars/`,
      `https://s3.${region}.amazonaws.com/${publicBucket}/avatars/`,
    ];

    if (cloudfrontUrl) allowed.push(`${cloudfrontUrl}/avatars/`);

    if (!allowed.some((prefix) => url.startsWith(prefix))) {
      throw new BusinessRuleException(
        'INVALID_AVATAR_URL',
        'Avatar URL must point to our storage service.',
      );
    }
  }

  async generatePresignedUploadUrl(
    key: string,
    contentType: string,
    fileSizeBytes: number,
  ): Promise<string> {
    const { accessKeyId, secretAccessKey, region } = this.config.aws;

    if (!accessKeyId || !secretAccessKey) {
      throw new BusinessRuleException(
        'STORAGE_NOT_CONFIGURED',
        'File upload is not available. Please contact support.',
      );
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

      const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
      const command = new PutObjectCommand({
        Bucket: this.config.s3.publicBucket,
        Key: key,
        ContentType: contentType,
        ContentLength: fileSizeBytes,
      });

      return getSignedUrl(s3, command, { expiresIn: 900 });
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND') {
        throw new BusinessRuleException(
          'STORAGE_NOT_CONFIGURED',
          'File upload is not available. Please contact support.',
        );
      }
      throw err;
    }
  }
}
