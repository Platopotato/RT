import { io, Socket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, GameState, User, FullBackupState, Tribe, HexData, GameAction, ChiefRequest, AssetRequest, DiplomaticProposal } from '../lib/types';

// Create a socket instance with proper typing
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
  process.env.NODE_ENV === 'production' 
    ? window.location.origin 
    : 'http://localhost:3000',
  {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
  }
);

// Connection status tracking
let isConnected = false;

// Event listeners
socket.on('connect', () => {
  console.log('Connected to server');
  isConnected = true;
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
  isConnected = false;
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  isConnected = false;
});

// Helper function to ensure socket is connected before emitting events
const ensureConnection = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isConnected) {
      resolve();
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const timeout = setTimeout(() => {
      socket.off('connect');
      reject(new Error('Connection timeout'));
    }, 5000);

    socket.once('connect', () => {
      clearTimeout(timeout);
      isConnected = true;
      resolve();
    });
  });
};

// API functions that emit events to the server
export const api = {
  // Get initial game state
  getInitialState: async (): Promise<void> => {
    await ensureConnection();
    socket.emit('get_initial_state');
  },

  // Authentication
  login: async (username: string, password: string): Promise<void> => {
    await ensureConnection();
    socket.emit('login', { username, password });
  },

  register: async (data: { username: string, password: string, securityQuestion: string, securityAnswer: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('register', data);
  },

  getSecurityQuestion: async (username: string): Promise<void> => {
    await ensureConnection();
    socket.emit('get_security_question', username);
  },

  verifySecurityAnswer: async (data: { username: string, answer: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('verify_security_answer', data);
  },

  resetPassword: async (data: { username: string, newPassword: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('reset_password', data);
  },

  // Game actions
  createTribe: async (tribeData: Omit<Tribe, 'id' | 'turnSubmitted' | 'actions' | 'lastTurnResults' | 'exploredHexes' | 'rationLevel' | 'completedTechs' | 'assets' | 'currentResearch' | 'journeyResponses' | 'diplomacy'>): Promise<void> => {
    await ensureConnection();
    socket.emit('create_tribe', tribeData);
  },

  submitTurn: async (data: { tribeId: string, plannedActions: GameAction[], journeyResponses: Tribe['journeyResponses'] }): Promise<void> => {
    await ensureConnection();
    socket.emit('submit_turn', data);
  },

  processTurn: async (): Promise<void> => {
    await ensureConnection();
    socket.emit('process_turn');
  },

  updateTribe: async (updatedTribe: Tribe): Promise<void> => {
    await ensureConnection();
    socket.emit('update_tribe', updatedTribe);
  },

  // Admin actions
  removePlayer: async (userId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('remove_player', userId);
  },

  startNewGame: async (): Promise<void> => {
    await ensureConnection();
    socket.emit('start_new_game');
  },

  loadBackup: async (backup: FullBackupState): Promise<void> => {
    await ensureConnection();
    socket.emit('load_backup', backup);
  },

  updateMap: async (data: { newMapData: HexData[], newStartingLocations: string[] }): Promise<void> => {
    await ensureConnection();
    socket.emit('update_map', data);
  },

  // Chief and asset management
  requestChief: async (data: { tribeId: string, chiefName: string, radixAddressSnippet: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('request_chief', data);
  },

  approveChief: async (requestId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('approve_chief', requestId);
  },

  denyChief: async (requestId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('deny_chief', requestId);
  },

  requestAsset: async (data: { tribeId: string, assetName: string, radixAddressSnippet: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('request_asset', data);
  },

  approveAsset: async (requestId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('approve_asset', requestId);
  },

  denyAsset: async (requestId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('deny_asset', requestId);
  },

  // AI tribe management
  addAITribe: async (): Promise<void> => {
    await ensureConnection();
    socket.emit('add_ai_tribe');
  },

  // Diplomacy
  proposeAlliance: async (data: { fromTribeId: string, toTribeId: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('propose_alliance', data);
  },

  sueForPeace: async (data: { fromTribeId: string, toTribeId: string, reparations: { food: number, scrap: number, weapons: number } }): Promise<void> => {
    await ensureConnection();
    socket.emit('sue_for_peace', data);
  },

  acceptProposal: async (proposalId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('accept_proposal', proposalId);
  },

  rejectProposal: async (proposalId: string): Promise<void> => {
    await ensureConnection();
    socket.emit('reject_proposal', proposalId);
  },

  declareWar: async (data: { fromTribeId: string, toTribeId: string }): Promise<void> => {
    await ensureConnection();
    socket.emit('declare_war', data);
  },
};

// Event subscription helpers
export const events = {
  onGameStateUpdated: (callback: (state: GameState) => void) => {
    socket.on('gamestate_updated', callback);
    return () => socket.off('gamestate_updated', callback);
  },

  onUsersUpdated: (callback: (users: Omit<User, 'passwordHash' | 'securityAnswerHash'>[]) => void) => {
    socket.on('users_updated', callback);
    return () => socket.off('users_updated', callback);
  },

  onInitialState: (callback: (data: { gameState: GameState, users: Omit<User, 'passwordHash' | 'securityAnswerHash'>[] }) => void) => {
    socket.on('initial_state', callback);
    return () => socket.off('initial_state', callback);
  },

  onLoginSuccess: (callback: (user: Omit<User, 'passwordHash' | 'securityAnswerHash'>) => void) => {
    socket.on('login_success', callback);
    return () => socket.off('login_success', callback);
  },

  onLoginFail: (callback: (message: string) => void) => {
    socket.on('login_fail', callback);
    return () => socket.off('login_fail', callback);
  },

  onRegisterFail: (callback: (message: string) => void) => {
    socket.on('register_fail', callback);
    return () => socket.off('register_fail', callback);
  },

  onSecurityQuestion: (callback: (question: string | null) => void) => {
    socket.on('security_question', callback);
    return () => socket.off('security_question', callback);
  },

  onAnswerVerified: (callback: (isCorrect: boolean) => void) => {
    socket.on('answer_verified', callback);
    return () => socket.off('answer_verified', callback);
  },

  onResetPasswordSuccess: (callback: (message: string) => void) => {
    socket.on('reset_password_success', callback);
    return () => socket.off('reset_password_success', callback);
  },

  onResetPasswordFail: (callback: (message: string) => void) => {
    socket.on('reset_password_fail', callback);
    return () => socket.off('reset_password_fail', callback);
  },

  onAlert: (callback: (message: string) => void) => {
    socket.on('alert', callback);
    return () => socket.off('alert', callback);
  },
};

export default socket;
