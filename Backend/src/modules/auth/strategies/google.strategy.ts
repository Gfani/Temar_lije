import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        '933501285980-kc8odq4llkijcrppkccbvf4u1gejhasl.apps.googleusercontent.com',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'placeholder-google-client-secret',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'https://temar-lije.southafricanorth.cloudapp.azure.com/api/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const email = profile.emails?.[0]?.value;
    const emailVerified = profile.emails?.[0]?.verified === true;

    if (!email) {
      return done(
        new Error('Google account has no accessible email address'),
        undefined,
      );
    }

    const normalizedProfile = {
      googleId: profile.id,
      email: email.trim().toLowerCase(),
      fullName: profile.displayName || email,
      emailVerified,
    };

    done(null, normalizedProfile);
  }
}
