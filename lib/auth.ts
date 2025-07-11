
import { User } from '../types';
import { SECURITY_QUESTIONS } from '../constants';

const USERS_DB_KEY = 'radix_tribes_users';

// This is a MOCK hashing function. DO NOT USE IN PRODUCTION.
// A real app would use a library like bcrypt.
const mockHash = (data: string): string => {
    // A simple way to "hash" for this mock environment.
    return `hashed_${data}_salted_v1`;
};

function getUsers(): User[] {
    const usersJson = localStorage.getItem(USERS_DB_KEY);
    
    if (usersJson) {
        // Migration for existing users
        const users = JSON.parse(usersJson) as Partial<User>[];
        let needsUpdate = false;
        
        // Force-reset admin password to 'snoopy' to fix login issues
        const adminUserIndex = users.findIndex(u => u.username?.toLowerCase() === 'admin');
        if (adminUserIndex !== -1) {
            const adminUser = users[adminUserIndex];
            const correctPasswordHash = mockHash('snoopy');
            if (adminUser.passwordHash !== correctPasswordHash) {
                adminUser.passwordHash = correctPasswordHash;
                needsUpdate = true;
            }
        }
        
        const migratedUsers = users.map(user => {
            if (!user.securityQuestion || !user.securityAnswerHash) {
                needsUpdate = true;
                return {
                    ...user,
                    securityQuestion: SECURITY_QUESTIONS[0],
                    // Provide a default answer for old users to allow recovery
                    securityAnswerHash: mockHash('buddy'), 
                };
            }
            return user;
        });

        if (needsUpdate) {
            saveUsers(migratedUsers as User[]);
        }
        return migratedUsers as User[];
    }

    // If no users, create default ones and return them
    const defaultUsers: User[] = [
        { id: 'user-admin', username: 'Admin', passwordHash: mockHash('snoopy'), role: 'admin', securityQuestion: SECURITY_QUESTIONS[0], securityAnswerHash: mockHash('snoopy') },
        { id: 'user-1', username: 'gordon', passwordHash: mockHash('password'), role: 'player', securityQuestion: SECURITY_QUESTIONS[0], securityAnswerHash: mockHash('buddy') },
        { id: 'user-2', username: 'player2', passwordHash: mockHash('password'), role: 'player', securityQuestion: SECURITY_QUESTIONS[1], securityAnswerHash: mockHash('buddy') },
    ];
    saveUsers(defaultUsers);
    return defaultUsers;
}

function saveUsers(users: User[]): void {
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
}

export function getAllUsers(): User[] {
    return getUsers();
}

export function register(username: string, password: string, securityQuestion: string, securityAnswer: string): { user: User | null, error: string | null } {
    const users = getUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { user: null, error: 'Username is already taken.' };
    }
    
    const newUser: User = {
        id: `user-${Date.now()}`,
        username,
        passwordHash: mockHash(password),
        role: 'player',
        securityQuestion,
        securityAnswerHash: mockHash(securityAnswer.toLowerCase().trim()),
    };

    saveUsers([...users, newUser]);

    return { user: newUser, error: null };
}

export function login(username: string, password: string): User | null {
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user && user.passwordHash === mockHash(password)) {
        sessionStorage.setItem('radix_user', JSON.stringify(user));
        return user;
    }
    return null;
}

export function logout(): void {
    sessionStorage.removeItem('radix_user');
}

export function getCurrentUser(): User | null {
    const userJson = sessionStorage.getItem('radix_user');
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// --- Password Recovery Functions ---

export function getUserQuestion(username: string): string | null {
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    return user ? user.securityQuestion : null;
}

export function verifySecurityAnswer(username: string, answer: string): boolean {
    const users = getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
        return user.securityAnswerHash === mockHash(answer.toLowerCase().trim());
    }
    return false;
}

export function resetPassword(username: string, newPassword: string): boolean {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIndex !== -1) {
        users[userIndex].passwordHash = mockHash(newPassword);
        saveUsers(users);
        return true;
    }
    return false;
}

export function removeUser(userId: string): void {
    const users = getUsers();
    const updatedUsers = users.filter(u => u.id !== userId);
    saveUsers(updatedUsers);
}

// --- Backup & Restore Functions ---

export function replaceAllUsers(users: User[]): void {
    saveUsers(users);
}

export function refreshCurrentUserInSession(user: User): void {
    sessionStorage.setItem('radix_user', JSON.stringify(user));
}
