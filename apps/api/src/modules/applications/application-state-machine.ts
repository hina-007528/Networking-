import { ApplicationStatus } from '@prisma/client';
import { AppException } from '../../common/errors/app.exception';

/**
 * Legal application status transitions.
 *
 * Modelling this as data rather than as branches in a service keeps the lifecycle auditable: the
 * admin console renders its action buttons from the same map the API enforces, so a button can
 * never offer a transition the server will refuse.
 */
export const APPLICATION_TRANSITIONS: Readonly<Record<ApplicationStatus, ApplicationStatus[]>> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.CANCELLED],
  [ApplicationStatus.SUBMITTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.PAYMENT_PENDING,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.PAYMENT_PENDING]: [
    ApplicationStatus.PAYMENT_RECEIVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.PAYMENT_RECEIVED]: [
    ApplicationStatus.APPROVED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.APPROVED]: [
    ApplicationStatus.INSTALLATION_SCHEDULED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.INSTALLATION_SCHEDULED]: [
    ApplicationStatus.INSTALLATION_IN_PROGRESS,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.INSTALLATION_IN_PROGRESS]: [
    ApplicationStatus.ACTIVE,
    ApplicationStatus.CANCELLED,
  ],
  // Terminal states.
  [ApplicationStatus.ACTIVE]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.CANCELLED]: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: ApplicationStatus, to: ApplicationStatus): void {
  if (from === to) {
    throw AppException.conflict(`The application is already ${to.toLowerCase().replace(/_/g, ' ')}`);
  }

  if (!canTransition(from, to)) {
    throw AppException.conflict(
      `An application cannot move from ${from} to ${to}`,
    );
  }
}

/** Statuses that mean the application has become a live subscription. */
export const APPLICATION_TERMINAL_STATUSES: ApplicationStatus[] = [
  ApplicationStatus.ACTIVE,
  ApplicationStatus.REJECTED,
  ApplicationStatus.CANCELLED,
];
