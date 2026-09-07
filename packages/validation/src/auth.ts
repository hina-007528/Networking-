import { z } from 'zod';
import { emailSchema, mobileSchema, nameSchema, passwordSchema, uuidSchema } from './primitives';

export const otpPurposeSchema = z.enum([
  'REGISTRATION',
  'LOGIN',
  'APPLICATION',
  'PASSWORD_RESET',
  'MOBILE_VERIFICATION',
]);

export const registerSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    mobile: mobileSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    cityId: z.preprocess(
      (value) => (value === '' || value === null ? undefined : value),
      uuidSchema.optional(),
    ),
    cityName: z.string().trim().min(2).max(80).optional(),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms and conditions' }),
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** The API contract omits `confirmPassword`, which is a client-side concern only. */
export const registerApiSchema = registerSchema
  .innerType()
  .omit({ confirmPassword: true })
  .extend({
    verificationToken: z.string().min(10).optional(),
    cityName: z.string().trim().min(2).max(80).optional(),
    planSlug: z.string().trim().max(120).optional(),
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, 'Enter your email address or mobile number')
    .max(254, 'Value is too long'),
  password: z.string().min(1, 'Enter your password'),
  rememberMe: z.boolean().default(false),
});

export const otpRequestSchema = z
  .object({
    mobile: mobileSchema,
    purpose: otpPurposeSchema,
    email: emailSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.purpose === 'REGISTRATION' || value.purpose === 'APPLICATION') && !value.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'Enter your email so we can send the confirmation code',
      });
    }
  });

export const otpVerifySchema = z.object({
  requestId: uuidSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'Enter the code we sent you'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email address or mobile number').max(254),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'This reset link is invalid'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordApiSchema = resetPasswordSchema.innerType().omit({
  confirmPassword: true,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'Choose a password you have not used before',
    path: ['newPassword'],
  });

export const changePasswordApiSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20).optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type OtpRequestInput = z.input<typeof otpRequestSchema>;
export type OtpVerifyInput = z.input<typeof otpVerifySchema>;
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
