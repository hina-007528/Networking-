import { Prisma } from '@prisma/client';
import { AppException } from '../errors/app.exception';

/** Turns a unique-constraint failure into a 409 the admin UI can show. */
export function throwIfUniqueConflict(error: unknown, message: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw AppException.conflict(message);
  }
  throw error;
}
