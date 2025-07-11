import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Import types
import {
  GameState,
  User,
  FullBackupState,
  Tribe,
  HexData,
  POIType,
  TerrainType,
  DiplomaticStatus,
  ClientToServerEvents,
  ServerToClientEvents,
  ChiefRequest,
  AssetRequest,
  DiplomaticProposal,
  GameAction,
  DiplomaticRelation,
  Garrison,
  MapSettings
} from '../../lib/types';

// Import game logic
import { processGlobalTurn } from './gameLogic/turnProcessor';
import { generateMapData } from './gameLogic/mapGenerator';
import { getHexesInRange, parseHexCoords } from '../../lib/mapUtils';
import { SECURITY_QUESTIONS, TRIBE_COLORS, POI_RARITY_MAP, VISIBILITY_RANGE, MAP_RADIUS } from '../../lib/constants';

// These will be imported from their respective modules
import { generateAITribe } from './gameLogic/ai/aiTribeGenerator';
import { generateAIActions } from './gameLogic/ai/aiActions';
import { ALL_CHIEFS } from './gameLogic/data/chiefData';
import { getAsset } from './gameLogic/data/assetData';

// --- SERVER SETUP ---
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// Use an environment variable for the data directory, defaulting to the project root.
// This is crucial for platforms like Render.com with persistent disks.
const DATA_DIR = process.env.DATA_DIR || path.join(rootDir, 'data');
const DATA_FILE = path.join(DATA_DIR, 'game-data.json');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- DATABASE (FILE-BASED) ---
let gameState: GameState;
let users: User[];

/**
 * Returns default map settings
 */
const getDefaultMapSettings = (): MapSettings => ({
  biases: {
    [TerrainType.Plains]: 1,
    [TerrainType.Desert]: 1,
    [TerrainType.Mountains]: 1,
    [TerrainType.Forest]: 1,
    [TerrainType.Ruins]: 0.8,
    [TerrainType.Wasteland]: 1,
    [TerrainType.Water]: 1,
    [TerrainType.Radiation]: 0.5,
    [TerrainType.Crater]: 0.7,
    [TerrainType.Swamp]: 0.9
  }
});

/**
 * Returns a default game state with a newly generated map
 */
const getDefaultGameState = (): GameState => {
  const mapSeed = Date.now();
  const mapSettings = getDefaultMapSettings();
  const { map, startingLocations } = generateMapData(MAP_RADIUS, mapSeed, mapSettings);
  return {
    mapData: map,
    tribes: [],
    turn: 1,
    startingLocations,
    chiefRequests: [],
    assetRequests: [],
    journeys: [],
    diplomaticProposals: [],
    history: [],
    mapSeed,
    mapSettings,
  };
};

/**
 * Simple password hashing function (for demo purposes only)
 * In a real app, use bcrypt or similar
 */
const mockHash = (data: string): string => `hashed_${data}_salted_v1`;

/**
 * Load game data from file
 */
const loadData = (): void => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(rawData);
      gameState = data.gameState;
      users = data.users;
      console.log('Game data loaded successfully');
    } catch (error) {
      console.error('Error loading game data:', error);
      initializeDefaultData();
    }
  } else {
    initializeDefaultData();
  }
};

/**
 * Initialize default game data
 */
const initializeDefaultData = (): void => {
  gameState = getDefaultGameState();
  users = [{
    id: 'user-admin',
    username: 'Admin',
    passwordHash: mockHash('snoopy'),
    role: 'admin',
    securityQuestion: SECURITY_QUESTIONS[0],
    securityAnswerHash: mockHash('snoopy')
  }];
  saveData();
  console.log('Default game data initialized');
};

/**
 * Save game data to file
 */
const saveData = (): void => {
  try {
    const data = { gameState, users };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("!!! FAILED TO SAVE DATA !!!");
    console.error(err);
  }
};

// Initial load
loadData();

// --- API (SOCKET.IO) ---
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Helper functions to emit updates to clients
  const emitGameState = () => io.emit('gamestate_updated', gameState);
  const emitUsers = () => io.emit('users_updated', users.map(({ passwordHash, securityAnswerHash, ...rest }) => rest));

  // Send initial state to client
  socket.on('get_initial_state', () => {
    socket.emit('initial_state', {
      gameState,
      users: users.map(({ passwordHash, securityAnswerHash, ...rest }) => rest)
    });
  });

  // Authentication handlers
  socket.on('login', ({ username, password }) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && user.passwordHash === mockHash(password)) {
      const { passwordHash, securityAnswerHash, ...userToSend } = user;
      socket.emit('login_success', userToSend);
    } else {
      socket.emit('login_fail', 'Invalid username or password.');
    }
  });

  socket.on('register', (data) => {
    if (users.find(u => u.username.toLowerCase() === data.username.toLowerCase())) {
      return socket.emit('register_fail', 'Username is already taken.');
    }
    const newUser = {
      id: `user-${Date.now()}`,
      username: data.username,
      passwordHash: mockHash(data.password),
      role: 'player',
      securityQuestion: data.securityQuestion,
      securityAnswerHash: mockHash(data.securityAnswer.toLowerCase().trim()),
    };
    users.push(newUser);
    saveData();
    const { passwordHash, securityAnswerHash, ...userToSend } = newUser;
    socket.emit('login_success', userToSend); // Auto-login
    emitUsers();
  });
  
  // Password recovery handlers
  socket.on('get_security_question', (username) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    socket.emit('security_question', user ? user.securityQuestion : null);
  });

  socket.on('verify_security_answer', ({username, answer}) => {
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    const isCorrect = user ? user.securityAnswerHash === mockHash(answer.toLowerCase().trim()) : false;
    socket.emit('answer_verified', isCorrect);
  });

  socket.on('reset_password', ({username, newPassword}) => {
    const userIndex = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
    if (userIndex !== -1) {
      users[userIndex].passwordHash = mockHash(newPassword);
      saveData();
      socket.emit('reset_password_success', 'Password reset successfully! You can now log in.');
    } else {
      socket.emit('reset_password_fail', 'An error occurred.');
    }
  });

  // Game action handlers
  socket.on('create_tribe', (newTribeData) => {
    const occupiedLocations = new Set(gameState.tribes.map(t => t.location));
    const availableStart = gameState.startingLocations.find(loc => !occupiedLocations.has(loc));
    if (!availableStart) return socket.emit('alert', "No available starting locations.");

    const startCoords = parseHexCoords(availableStart);
    const initialExplored = getHexesInRange(startCoords, VISIBILITY_RANGE);

    const newTribe: Tribe = {
      ...newTribeData,
      id: `tribe-${Date.now()}`,
      location: availableStart,
      globalResources: { food: 100, scrap: 20, morale: 50 },
      garrisons: { [availableStart]: { troops: 20, weapons: 10, chiefs: [] } },
      actions: [],
      turnSubmitted: false,
      lastTurnResults: [],
      exploredHexes: initialExplored,
      rationLevel: 'Normal',
      completedTechs: [],
      assets: [],
      currentResearch: null,
      journeyResponses: [],
      diplomacy: {},
    };
    
    gameState.tribes.forEach(existingTribe => {
      const initialStatus = existingTribe.isAI ? DiplomaticStatus.War : DiplomaticStatus.Neutral;
      newTribe.diplomacy[existingTribe.id] = { status: initialStatus };
      existingTribe.diplomacy[newTribe.id] = { status: initialStatus };
    });

    gameState.tribes.push(newTribe);
    saveData();
    emitGameState();
  });

  socket.on('submit_turn', ({ tribeId, plannedActions, journeyResponses }) => {
    const tribe = gameState.tribes.find(t => t.id === tribeId);
    if (tribe) {
      tribe.actions = plannedActions;
      tribe.turnSubmitted = true;
      tribe.journeyResponses = journeyResponses;
      saveData();
      emitGameState();
    }
  });

  socket.on('process_turn', () => {
    // Add AI actions
    gameState.tribes.forEach(tribe => {
      if (tribe.isAI && !tribe.turnSubmitted) {
        tribe.actions = generateAIActions(tribe, gameState.tribes, gameState.mapData);
        tribe.turnSubmitted = true;
      }
    });
    gameState = processGlobalTurn(gameState);
    saveData();
    emitGameState();
  });
  
  // Generic handler for game actions
  const createGenericHandler = (
    updateLogic: (state: GameState, users: User[], payload: any) => void
  ) => (payload: any) => {
    updateLogic(gameState, users, payload);
    saveData();
    emitGameState();
    emitUsers();
  };

  // Define action handlers
  const actionHandlers: {
    [key: string]: (state: GameState, users: User[], payload: any) => void
  } = {
    'update_tribe': (state, users, updatedTribe) => { 
      state.tribes = state.tribes.map(t => t.id === updatedTribe.id ? updatedTribe : t) 
    },
    'remove_player': (state, users, userId) => { 
      state.tribes = state.tribes.filter(t => t.playerId !== userId);
      users = users.filter(u => u.id !== userId);
    },
    'start_new_game': (state) => {
      state.tribes = []; 
      state.chiefRequests = []; 
      state.assetRequests = [];
      state.journeys = []; 
      state.turn = 1; 
      state.diplomaticProposals = []; 
      state.history = [];
    },
    'load_backup': (state, users, backup) => { 
      Object.assign(gameState, backup.gameState); 
      Object.assign(users, backup.users);
    },
    'update_map': (state, users, {newMapData, newStartingLocations}) => {
      state.mapData = newMapData;
      state.startingLocations = newStartingLocations;
    },
    'request_chief': (state, users, payload) => { 
      state.chiefRequests.push({ id: `req-${Date.now()}`, ...payload, status: 'pending' }) 
    },
    'approve_chief': (state, users, reqId) => {
      const req = state.chiefRequests.find(r => r.id === reqId);
      if(req) {
        req.status = 'approved';
        const tribe = state.tribes.find(t => t.id === req.tribeId);
        const chiefData = ALL_CHIEFS.find(c => c.name === req.chiefName);
        if(tribe && chiefData) tribe.garrisons[tribe.location].chiefs.push(chiefData);
      }
    },
    'deny_chief': (state, users, reqId) => { 
      const req = state.chiefRequests.find(r => r.id === reqId); 
      if(req) req.status = 'denied'; 
    },
    'request_asset': (state, users, payload) => { 
      state.assetRequests.push({ id: `asset-req-${Date.now()}`, ...payload, status: 'pending' }) 
    },
    'approve_asset': (state, users, reqId) => {
      const req = state.assetRequests.find(r => r.id === reqId);
      if(req) {
        req.status = 'approved';
        const tribe = state.tribes.find(t => t.id === req.tribeId);
        if(tribe && getAsset(req.assetName)) tribe.assets.push(req.assetName);
      }
    },
    'deny_asset': (state, users, reqId) => { 
      const req = state.assetRequests.find(r => r.id === reqId); 
      if(req) req.status = 'denied'; 
    },
    'add_ai_tribe': (state) => {
      const occupied = new Set(state.tribes.map(t => t.location));
      const start = state.startingLocations.find(loc => !occupied.has(loc));
      if (start) {
        const aiTribe = generateAITribe(start, state.tribes.map(t => t.tribeName));
        state.tribes.forEach(t => {
          aiTribe.diplomacy[t.id] = { status: DiplomaticStatus.War };
          t.diplomacy[aiTribe.id] = { status: DiplomaticStatus.War };
        });
        state.tribes.push(aiTribe);
      }
    },
    'propose_alliance': (state, users, { fromTribeId, toTribeId }) => {
      const fromTribe = state.tribes.find(t => t.id === fromTribeId);
      if(fromTribe) state.diplomaticProposals.push({ 
        id: `proposal-${Date.now()}`, 
        fromTribeId, 
        toTribeId, 
        statusChangeTo: DiplomaticStatus.Alliance, 
        expiresOnTurn: state.turn + 3, 
        fromTribeName: fromTribe.tribeName 
      });
    },
    'sue_for_peace': (state, users, { fromTribeId, toTribeId, reparations }) => {
      const fromTribe = state.tribes.find(t => t.id === fromTribeId);
      if(fromTribe) state.diplomaticProposals.push({ 
        id: `proposal-${Date.now()}`, 
        fromTribeId, 
        toTribeId, 
        statusChangeTo: DiplomaticStatus.Neutral, 
        expiresOnTurn: state.turn + 3, 
        fromTribeName: fromTribe.tribeName, 
        reparations 
      });
    },
    'declare_war': (state, users, { fromTribeId, toTribeId }) => {
      const fromTribe = state.tribes.find(t => t.id === fromTribeId);
      const toTribe = state.tribes.find(t => t.id === toTribeId);
      if(fromTribe && toTribe) {
        fromTribe.diplomacy[toTribeId] = { status: DiplomaticStatus.War };
        toTribe.diplomacy[fromTribeId] = { status: DiplomaticStatus.War };
      }
    },
    'accept_proposal': (state, users, proposalId) => {
      const proposal = state.diplomaticProposals.find(p => p.id === proposalId);
      if (!proposal) return;
      const fromTribe = state.tribes.find(t => t.id === proposal.fromTribeId);
      const toTribe = state.tribes.find(t => t.id === proposal.toTribeId);
      if (!fromTribe || !toTribe) return;
      // Simplified logic for acceptance
      fromTribe.diplomacy[toTribe.id] = { status: proposal.statusChangeTo };
      toTribe.diplomacy[fromTribe.id] = { status: proposal.statusChangeTo };
      state.diplomaticProposals = state.diplomaticProposals.filter(p => p.id !== proposalId);
    },
    'reject_proposal': (state, users, proposalId) => {
      state.diplomaticProposals = state.diplomaticProposals.filter(p => p.id !== proposalId);
    }
  };
  
  // Register all action handlers
  for (const [action, handler] of Object.entries(actionHandlers)) {
    socket.on(action as keyof ClientToServerEvents, createGenericHandler(handler));
  }

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// --- STATIC FILE SERVING ---
// Serve static files from the public directory
app.use(express.static(path.join(rootDir, 'public')));

// Serve the React app for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(rootDir, 'public', 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Game data stored in: ${DATA_FILE}`);
});

export default server;
