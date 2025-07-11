import { User } from '../lib/types';

// Key for storing the current user in localStorage
const USER_STORAGE_KEY = 'radix_tribes_current_user';

/**
 * Stores the user data in localStorage
 * @param user The user data to store
 */
export function setCurrentUser(user: Omit<User, 'passwordHash' | 'securityAnswerHash'>): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

/**
 * Retrieves the current user from localStorage
 * @returns The current user or null if not logged in
 */
export function getCurrentUser(): Omit<User, 'passwordHash' | 'securityAnswerHash'> | null {
  const userJson = localStorage.getItem(USER_STORAGE_KEY);
  if (!userJson) return null;
  
  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
}

/**
 * Checks if a user is currently logged in
 * @returns True if a user is logged in, false otherwise
 */
export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Checks if the current user has admin privileges
 * @returns True if the current user is an admin, false otherwise
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user !== null && user.role === 'admin';
}

/**
 * Logs the user out by removing their data from localStorage
 */
export function logout(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * Updates the current user's data in localStorage
 * Used when user data changes but we don't want to log them out
 * @param updatedUser The updated user data
 */
export function updateCurrentUser(updatedUser: Partial<Omit<User, 'passwordHash' | 'securityAnswerHash'>>): void {
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  setCurrentUser({
    ...currentUser,
    ...updatedUser
  });
}

/**
 * Refreshes the current user in the session with new data
 * Used when loading from backup or when user data is updated on the server
 * @param user The new user data
 */
export function refreshCurrentUserInSession(user: Omit<User, 'passwordHash' | 'securityAnswerHash'>): void {
  setCurrentUser(user);
}
