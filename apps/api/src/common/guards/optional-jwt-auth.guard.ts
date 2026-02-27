import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that attempts JWT authentication but does NOT reject unauthenticated requests.
 * If a valid token is present, request.user is populated; otherwise it remains undefined.
 * Useful for endpoints that serve public content but can personalize for logged-in users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(_err: any, user: any) {
    // Never throw – just return user or null
    return user || null;
  }
}
