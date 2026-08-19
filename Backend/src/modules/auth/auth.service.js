const {
  ConflictException,
  Injectable,
  Dependencies,
  UnauthorizedException,
} = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const { ConfigService } = require('@nestjs/config');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { PrismaService } = require('../../database/prisma.service');

const BCRYPT_SALT_ROUNDS = 12;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

@Injectable()
@Dependencies(PrismaService, JwtService, ConfigService)
class AuthService {
  constructor(prisma, jwtService, configService) {
    this.prisma = prisma;
    this.jwtService = jwtService;
    this.configService = configService;

    this._dummyHashPromise = this._hashPassword(
      'a-constant-placeholder-value-never-used-as-a-real-password',
    );
  }

  _hashPassword(plain) {
    return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
  }

  async _registerFailedLoginAttempt(user) {
    const attempts = user.failedLoginAttempts + 1;
    const data = { failedLoginAttempts: attempts };

    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      data.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      data.failedLoginAttempts = 0;
    }

    await this.prisma.user.update({ where: { id: user.id }, data });
  }

  async _issueTokenPair(payload) {
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { refreshTokenHash },
    });

    return { accessToken, refreshToken };
  }

  async register(dto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this._hashPassword(dto.password);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          passwordHash,
          role: dto.role,
        },
      });
    } catch {
      throw new ConflictException('An account with this email already exists');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken } = await this._issueTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(dto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new UnauthorizedException(
        `Account temporarily locked due to repeated failed attempts. Try again in ${minutesRemaining} minute(s).`,
      );
    }

    const realHash = user?.passwordHash;
    const hashToCheck = realHash ?? (await this._dummyHashPromise);
    const passwordMatches = await bcrypt.compare(dto.password, hashToCheck);

    if (!user || !realHash || !passwordMatches) {
      if (user && realHash) {
        await this._registerFailedLoginAttempt(user);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken } = await this._issueTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Finds or creates a user from a verified Google profile, then
   * issues the same access+refresh pair as password login. Three
   * distinct paths, in order:
   *
   * @param {{googleId: string, email: string, fullName: string, emailVerified: boolean}} googleProfile
   * @param {'STUDENT'|'TEACHER'|null} requestedRole - decoded from the
   * signed OAuth state, meaningful only for brand-new accounts. An
   * existing user's role is never altered by this parameter — role
   * is set once, at account creation, full stop.
   */
  async loginWithGoogle(googleProfile, requestedRole) {
    const { googleId, email, fullName, emailVerified } = googleProfile;

    // Path 1: returning user who already linked Google previously.
    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // Path 2: no googleId match, but an email/password account
      // already owns this email — link rather than create a
      // duplicate row under the same address. Linking is gated on
      // Google itself reporting the email as verified: Google is the
      // party asserting ownership here, so an *unverified* Google
      // email can't be used to attach a new identity to someone
      // else's existing password account.
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        if (!emailVerified) {
          throw new UnauthorizedException(
            "This Google account's email is unverified and cannot be linked to an existing account",
          );
        }
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId, isEmailVerified: true }, // Google's verification satisfies ours too, going forward
        });
      } else {
        // Path 3: genuinely new user. requestedRole is no longer
        // attacker-editable at this point — it survived a signature
        // check to get here — but it's still validated against the
        // same whitelist RegisterDto enforces rather than trusted
        // blindly, and the signin page's Google button intentionally
        // sends no role at all, which lands here too: a stranger's
        // email with nothing to identify them as student or teacher
        // is a genuinely ambiguous case, rejected rather than guessed.
        if (requestedRole !== 'STUDENT' && requestedRole !== 'TEACHER') {
          throw new UnauthorizedException(
            'No account found for this Google email. Please create an account first and select your role.',
          );
        }

        user = await this.prisma.user.create({
          data: {
            fullName,
            email,
            googleId,
            role: requestedRole,
            isEmailVerified: emailVerified,
            passwordHash: null, // Google-only account — see schema note on passwordHash nullability
          },
        });
      }
    }

    // Successful Google auth is proof of identity via a completely
    // different factor than password guessing — clear any
    // accumulated lockout state rather than leaving it in place.
    //
    // Deliberately NOT gating this whole method behind a lockedUntil
    // check the way login() is: lockout exists specifically to slow
    // down password brute-forcing. Blocking an unrelated, already-
    // secure auth method behind that same lock would punish the
    // legitimate account owner during exactly the moment they'd want
    // a working alternate way in.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken } = await this._issueTokenPair(payload);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshTokens(userId, refreshToken) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const incomingHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const storedHashBuffer = Buffer.from(user.refreshTokenHash, 'hex');
    const incomingHashBuffer = Buffer.from(incomingHash, 'hex');

    const hashesMatch =
      storedHashBuffer.length === incomingHashBuffer.length &&
      crypto.timingSafeEqual(storedHashBuffer, incomingHashBuffer);

    if (!hashesMatch) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const { accessToken, refreshToken: newRefreshToken } =
      await this._issueTokenPair(payload);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(userId) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}

module.exports = { AuthService };
