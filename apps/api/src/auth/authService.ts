import type { AuthUser, LoginRequest, RegisterRequest, UserRole } from "@graphsphere/shared";
import { jwtVerify, SignJWT } from "jose";
import { compare, hash } from "bcryptjs";
import type { AppConfig } from "../config.js";
import type { DomainStore } from "../domain/store.js";
import { unauthorized } from "../errors.js";

export class AuthService {
  private readonly secret: Uint8Array;

  public constructor(
    private readonly store: DomainStore,
    private readonly config: AppConfig
  ) {
    this.secret = new TextEncoder().encode(config.JWT_SECRET);
  }

  public async login(input: LoginRequest): Promise<{ token: string; user: AuthUser }> {
    const user = await this.store.findUserByEmail(input.email);
    if (!user) {
      throw unauthorized("Invalid email or password");
    }

    const validPassword = await compare(input.password, user.passwordHash);
    if (!validPassword) {
      throw unauthorized("Invalid email or password");
    }

    const authUser = toAuthUser(user);
    const token = await new SignJWT({
      role: authUser.role,
      organizationId: authUser.organizationId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(authUser.id)
      .setIssuer(this.config.JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${this.config.TOKEN_TTL_SECONDS}s`)
      .sign(this.secret);

    return { token, user: authUser };
  }

  public async register(input: RegisterRequest): Promise<{ token: string; user: AuthUser }> {
    const passwordHash = await hash(input.password, 10);
    const user = await this.store.addUser({
      email: input.email,
      passwordHash,
      role: input.role,
      organizationId: input.organizationId
    });

    const authUser = toAuthUser(user);
    const token = await new SignJWT({
      role: authUser.role,
      organizationId: authUser.organizationId
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(authUser.id)
      .setIssuer(this.config.JWT_ISSUER)
      .setIssuedAt()
      .setExpirationTime(`${this.config.TOKEN_TTL_SECONDS}s`)
      .sign(this.secret);

    return { token, user: authUser };
  }

  public async verifyToken(token: string): Promise<AuthUser> {
    try {
      const result = await jwtVerify(token, this.secret, {
        issuer: this.config.JWT_ISSUER
      });
      const subject = result.payload.sub;
      if (!subject) {
        throw unauthorized();
      }
      const user = await this.store.findUserById(subject);
      if (!user) {
        throw unauthorized();
      }
      return toAuthUser(user);
    } catch (error) {
      if (error instanceof Error && error.message === "Authentication is required") {
        throw error;
      }
      throw unauthorized();
    }
  }
}

export function hasRole(user: AuthUser, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(user.role);
}

function toAuthUser(user: {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId
  };
}
