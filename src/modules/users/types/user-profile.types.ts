import {
  Industry,
  PrimaryIntent,
  SubscriptionStatus,
  TwoFaMethod,
  UserRole,
  UserStatus,
} from '@prisma/client';

export interface OwnProfileResponse {
  id: string;
  email: string;
  fullName: string;
  status: UserStatus;
  primaryIntent: PrimaryIntent;
  emailVerifiedAt: Date | null;
  twoFaEnabled: boolean;
  twoFaMethod: TwoFaMethod | null;
  profile: {
    avatarUrl: string | null;
    bio: string | null;
    occupation: string | null;
    industry: Industry | null;
    role: UserRole | null;
    locationText: string | null;
    locationCountry: string | null;
    locationCity: string | null;
    nationality: string | null;
    investmentExperience: string | null;
    isVerified: boolean;
    verifiedAt: Date | null;
  } | null;
  interests: Industry[];
  subscription: {
    status: SubscriptionStatus;
    currentPeriodEnd: Date | null;
  } | null;
  createdAt: Date;
}

export interface PublicUserSummary {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole | null;
  industry: Industry | null;
  locationCountry: string | null;
  isVerified: boolean;
}

export interface PublicUserDetail extends PublicUserSummary {
  bio: string | null;
  occupation: string | null;
  locationText: string | null;
  locationCity: string | null;
  nationality: string | null;
  investmentExperience: string | null;
  interests: Industry[];
  verifiedAt: Date | null;
}
