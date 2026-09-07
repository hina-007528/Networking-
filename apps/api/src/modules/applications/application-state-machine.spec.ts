import { ApplicationStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition } from './application-state-machine';

describe('application state machine', () => {
  it('allows a submitted application to enter review', () => {
    expect(canTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)).toBe(true);
  });

  it('allows approval after payment is received', () => {
    expect(canTransition(ApplicationStatus.PAYMENT_RECEIVED, ApplicationStatus.APPROVED)).toBe(true);
  });

  it('refuses skipping installation', () => {
    expect(canTransition(ApplicationStatus.APPROVED, ApplicationStatus.ACTIVE)).toBe(false);
  });

  it('treats ACTIVE as terminal', () => {
    expect(canTransition(ApplicationStatus.ACTIVE, ApplicationStatus.CANCELLED)).toBe(false);
  });

  it('throws a conflict when the same status is requested twice', () => {
    expect(() => assertTransition(ApplicationStatus.SUBMITTED, ApplicationStatus.SUBMITTED)).toThrow(
      /already submitted/i,
    );
  });

  it('throws a conflict for an illegal jump', () => {
    expect(() => assertTransition(ApplicationStatus.DRAFT, ApplicationStatus.ACTIVE)).toThrow(/cannot move/i);
  });
});
