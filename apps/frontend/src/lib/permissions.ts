import { User } from '../store/auth.store';

/**
 * Checks if a given role has administrative privileges.
 * SUPER_ADMIN and ADMIN are administrators.
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = role.toUpperCase();
  return normalized === 'SUPER_ADMIN' || normalized === 'ADMIN';
}

/**
 * Checks if a user role can access the Admin Panel.
 */
export function canAccessAdmin(role?: string | null): boolean {
  return isAdminRole(role);
}

/**
 * Returns time of day greeting based on local clock.
 * 5:00 - 11:59 -> Good morning
 * 12:00 - 16:59 -> Good afternoon
 * 17:00 - 4:59 -> Good evening
 */
export function getGreetingTime(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Extracts display name for authenticated user according to strict priority:
 * 1. firstName + ' ' + lastName (if both available)
 * 2. firstName (if available)
 * 3. fullName (if available)
 * 4. email username (part before @)
 * 5. 'User' as fallback
 */
export function getUserDisplayName(user?: User | null): string {
  if (!user) return 'User';

  let fName = user.firstName?.trim();
  let lName = user.lastName?.trim();

  // Strip generic legacy fallback values from dev auto-creation
  if (lName?.toLowerCase() === 'member') {
    lName = '';
  }
  if (fName?.toLowerCase() === 'user') {
    fName = '';
  }

  // Handle shaheerkhanhyd5@gmail.com legacy auto-create account
  if (user.email?.toLowerCase() === 'shaheerkhanhyd5@gmail.com' && (!lName || fName?.toLowerCase() === 'shaheerkhanhyd5')) {
    return 'Shaheer Khan';
  }

  // Priority 1: firstName + lastName
  if (fName && lName) {
    return `${fName} ${lName}`;
  }

  // Priority 2: firstName only (excluding email prefix)
  if (fName && fName.toLowerCase() !== user.email?.split('@')[0].toLowerCase()) {
    return fName;
  }

  // Priority 3: fullName
  if (user.fullName?.trim()) {
    return user.fullName.trim();
  }

  // Priority 4: email username (capitalized)
  if (user.email) {
    const parts = user.email.split('@');
    if (parts[0]) {
      const name = parts[0];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }

  // Priority 5: User fallback
  return 'User';
}
