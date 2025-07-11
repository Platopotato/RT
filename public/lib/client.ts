import { io, Socket } from 'socket.io-client';
import { GameState, User, FullBackupState, GameAction, Tribe, DiplomaticProposal, HexData } from '../types';

let socket: Socket;

// Helper function to create a typed emitter
const createEmitter = <T>(eventName: string) => (payload: T) => {
    if (socket) {
        socket.emit(eventName, payload);
    }
};

export const initClient = (
    onStateUpdate: (newState: GameState) => void,
    onUsersUpdate: (users: User[]) => void,
    onLoginSuccess: (user: User) => void
) => {
    socket = io({
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('Connected to server!');
        socket.emit('get_initial_state');
    });
    
    socket.on('initial_state', (data: { gameState: GameState, users: User[] }) => {
        onStateUpdate(data.gameState);
        onUsersUpdate(data.users);
    });

    socket.on('gamestate_updated', (newState: GameState) => {
        onStateUpdate(newState);
    });

    socket.on('users_updated', (newUsers: User[]) => {
        onUsersUpdate(newUsers);
    });
    
    socket.on('login_success', (user: User) => {
        onLoginSuccess(user);
    });
    
    socket.on('login_fail', (error: string) => alert(`Login Failed: ${error}`));
    socket.on('register_fail', (error: string) => alert(`Registration Failed: ${error}`));
    socket.on('reset_password_success', (message: string) => alert(message));
    socket.on('reset_password_fail', (error: string) => alert(error));
    socket.on('security_question', (question: string | null) => {
        if (!question) alert('Username not found.');
        // This is a simple implementation. A real app would update the UI.
        const answer = prompt(`Security Question: ${question}`);
        if(answer) {
            const username = (document.getElementById('username-forgot') as HTMLInputElement)?.value;
            if(username) verifySecurityAnswer({ username, answer });
        }
    });
    socket.on('answer_verified', (isCorrect: boolean) => {
        if (!isCorrect) {
            alert('Incorrect answer.');
            return;
        }
        const newPassword = prompt('Enter your new password:');
        if (newPassword) {
            const username = (document.getElementById('username-forgot') as HTMLInputElement)?.value;
             if(username) resetPassword({ username, newPassword });
        }
    });

    socket.on('alert', (message: string) => {
        alert(message);
    });
};

// Auth emitters
export const login = createEmitter<{ username: string, password: string }>('login');
export const register = createEmitter<{ username: string, password: string, securityQuestion: string, securityAnswer: string }>('register');
export const getUserQuestion = createEmitter<string>('get_security_question');
export const verifySecurityAnswer = createEmitter<{ username: string, answer: string }>('verify_security_answer');
export const resetPassword = createEmitter<{ username: string, newPassword: string }>('reset_password');

// Game action emitters
export const createTribe = createEmitter<any>('create_tribe');
export const submitTurn = createEmitter<{ tribeId: string; plannedActions: GameAction[]; journeyResponses: Tribe['journeyResponses'] }>('submit_turn');
export const processTurn = () => socket.emit('process_turn');
export const updateTribe = createEmitter<Tribe>('update_tribe');
export const removePlayer = createEmitter<string>('remove_player');
export const startNewGame = () => socket.emit('start_new_game');
export const loadBackup = createEmitter<FullBackupState>('load_backup');
export const updateMap = createEmitter<{newMapData: HexData[], newStartingLocations: string[]}>('update_map');

// Chief/Asset emitters
export const requestChief = createEmitter<{ tribeId: string, chiefName: string, radixAddressSnippet: string }>('request_chief');
export const approveChief = createEmitter<string>('approve_chief');
export const denyChief = createEmitter<string>('deny_chief');
export const requestAsset = createEmitter<{ tribeId: string, assetName: string, radixAddressSnippet: string }>('request_asset');
export const approveAsset = createEmitter<string>('approve_asset');
export const denyAsset = createEmitter<string>('deny_asset');

// AI emitter
export const addAITribe = () => socket.emit('add_ai_tribe');

// Diplomacy emitters
export const proposeAlliance = createEmitter<{ fromTribeId: string, toTribeId: string }>('propose_alliance');
export const sueForPeace = createEmitter<{ fromTribeId: string, toTribeId: string, reparations: any }>('sue_for_peace');
export const declareWar = createEmitter<{ fromTribeId: string, toTribeId: string }>('declare_war');
export const acceptProposal = createEmitter<string>('accept_proposal');
export const rejectProposal = createEmitter<string>('reject_proposal');
