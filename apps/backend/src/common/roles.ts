// Role constants (replaces Prisma enum for SQLite compatibility)
export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  EMPLOYEE: 'EMPLOYEE',
  CLIENT: 'CLIENT',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
