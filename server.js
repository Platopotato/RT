
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// --- GAME LOGIC IMPORTS ---
// In a real project, these would be separate modules.
// For simplicity, we'll define them here or stub them.
// Note: The original TS files would be compiled to JS in a real build process.
// We'll simulate that by assuming their logic is available.
import { SECURITY_QUESTIONS } from './public/constants.js';
import { processGlobalTurn } from './public/turnProcessor.js';
import { generateAITribe } from './public/lib/ai/aiTribeGenerator.js';
import { generateAIActions } from './public/lib/ai/aiActions.js';
import { generateMapData } from './public/lib/mapGenerator.js';
import { ALL_CHIEFS } from './public/lib/chiefData.js';
import { getAsset } from './public/lib/assetData.js';
import { getHexesInRange, parseHexCoords } from './public/lib/mapUtils.js';
import { TRIBE_COLORS } from './public/constants.js';

// --- SERVER SETUP ---
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use an environment variable for the data directory, defaulting to the project root.
// This is crucial for platforms like Render.com with persistent disks.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'game-data.json');

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --- DATABASE (FILE-BASED) ---
let gameState;
let users;

const getDefaultMapSettings = () => ({
    biases: { Plains: 1, Desert: 1, Mountains: 1, Forest: 1, Ruins: 0.8, Wasteland: 1, Water: 1, Radiation: 0.5, Crater: 0.7, Swamp: 0.9 }
});

const getDefaultGameState = () => {
    const mapSeed = Date.now();
    const mapSettings = getDefaultMapSettings();
    const { map, startingLocations } = generateMapData(40, mapSeed, mapSettings);
    return {
        mapData: map, tribes: [], turn: 1, startingLocations,
        chiefRequests: [], assetRequests: [], journeys: [], diplomaticProposals: [],
        history: [], mapSeed, mapSettings,
    };
};

const mockHash = (data) => `hashed_${data}_salted_v1`;

const loadData = () => {
    if (fs.existsSync(DATA_FILE)) {
        const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(rawData);
        gameState = data.gameState;
        users = data.users;
    } else {
        gameState = getDefaultGameState();
        users = [{ id: 'user-admin', username: 'Admin', passwordHash: mockHash('snoopy'), role: 'admin', securityQuestion: SECURITY_QUESTIONS[0], securityAnswerHash: mockHash('snoopy') }];
        saveData();
    }
};

const saveData = () => {
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

    const emitGameState = () => io.emit('gamestate_updated', gameState);
    const emitUsers = () => io.emit('users_updated', users.map(({ passwordHash, securityAnswerHash, ...rest }) => rest));

    socket.on('get_initial_state', () => {
        socket.emit('initial_state', {
            gameState,
            users: users.map(({ passwordHash, securityAnswerHash, ...rest }) => rest)
        });
    });

    // Auth
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
    
    // Simple password recovery stubs
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


    // Game Actions
    socket.on('create_tribe', (newTribeData) => {
        const occupiedLocations = new Set(gameState.tribes.map(t => t.location));
        const availableStart = gameState.startingLocations.find(loc => !occupiedLocations.has(loc));
        if (!availableStart) return socket.emit('alert', "No available starting locations.");

        const startCoords = parseHexCoords(availableStart);
        const initialExplored = getHexesInRange(startCoords, 2);

        const newTribe = {
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
            const initialStatus = existingTribe.isAI ? 'War' : 'Neutral';
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
    
    // All other actions follow this pattern: find data, update, save, broadcast.
    const createGenericHandler = (updateLogic) => (payload) => {
        updateLogic(gameState, users, payload);
        saveData();
        emitGameState();
        emitUsers();
    };

    const actionHandlers = {
        'update_tribe': (state, users, updatedTribe) => { state.tribes = state.tribes.map(t => t.id === updatedTribe.id ? updatedTribe : t) },
        'remove_player': (state, users, userId) => { 
            state.tribes = state.tribes.filter(t => t.playerId !== userId);
            users = users.filter(u => u.id !== userId);
        },
        'start_new_game': (state) => {
            state.tribes = []; state.chiefRequests = []; state.assetRequests = [];
            state.journeys = []; state.turn = 1; state.diplomaticProposals = []; state.history = [];
        },
        'load_backup': (state, users, backup) => { 
            gameState = backup.gameState; 
            users = backup.users;
        },
        'update_map': (state, users, {newMapData, newStartingLocations}) => {
            state.mapData = newMapData;
            state.startingLocations = newStartingLocations;
        },
        'request_chief': (state, users, payload) => { state.chiefRequests.push({ id: `req-${Date.now()}`, ...payload, status: 'pending' }) },
        'approve_chief': (state, users, reqId) => {
            const req = state.chiefRequests.find(r => r.id === reqId);
            if(req) {
                req.status = 'approved';
                const tribe = state.tribes.find(t => t.id === req.tribeId);
                const chiefData = ALL_CHIEFS.find(c => c.name === req.chiefName);
                if(tribe && chiefData) tribe.garrisons[tribe.location].chiefs.push(chiefData);
            }
        },
        'deny_chief': (state, users, reqId) => { const req = state.chiefRequests.find(r => r.id === reqId); if(req) req.status = 'denied'; },
        'request_asset': (state, users, payload) => { state.assetRequests.push({ id: `asset-req-${Date.now()}`, ...payload, status: 'pending' }) },
        'approve_asset': (state, users, reqId) => {
            const req = state.assetRequests.find(r => r.id === reqId);
             if(req) {
                req.status = 'approved';
                const tribe = state.tribes.find(t => t.id === req.tribeId);
                if(tribe && getAsset(req.assetName)) tribe.assets.push(req.assetName);
            }
        },
        'deny_asset': (state, users, reqId) => { const req = state.assetRequests.find(r => r.id === reqId); if(req) req.status = 'denied'; },
        'add_ai_tribe': (state) => {
             const occupied = new Set(state.tribes.map(t => t.location));
             const start = state.startingLocations.find(loc => !occupied.has(loc));
             if (start) {
                const aiTribe = generateAITribe(start, state.tribes.map(t => t.tribeName));
                state.tribes.forEach(t => {
                    aiTribe.diplomacy[t.id] = { status: 'War' };
                    t.diplomacy[aiTribe.id] = { status: 'War' };
                });
                state.tribes.push(aiTribe);
             }
        },
        'propose_alliance': (state, users, { fromTribeId, toTribeId }) => {
            const fromTribe = state.tribes.find(t => t.id === fromTribeId);
            if(fromTribe) state.diplomaticProposals.push({ id: `proposal-${Date.now()}`, fromTribeId, toTribeId, statusChangeTo: 'Alliance', expiresOnTurn: state.turn + 3, fromTribeName: fromTribe.tribeName });
        },
        'sue_for_peace': (state, users, { fromTribeId, toTribeId, reparations }) => {
             const fromTribe = state.tribes.find(t => t.id === fromTribeId);
            if(fromTribe) state.diplomaticProposals.push({ id: `proposal-${Date.now()}`, fromTribeId, toTribeId, statusChangeTo: 'Neutral', expiresOnTurn: state.turn + 3, fromTribeName: fromTribe.tribeName, reparations });
        },
        'declare_war': (state, users, { fromTribeId, toTribeId }) => {
            const fromTribe = state.tribes.find(t => t.id === fromTribeId);
            const toTribe = state.tribes.find(t => t.id === toTribeId);
            if(fromTribe && toTribe) {
                fromTribe.diplomacy[toTribeId] = { status: 'War' };
                toTribe.diplomacy[fromTribeId] = { status: 'War' };
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
    
    for (const [action, handler] of Object.entries(actionHandlers)) {
        socket.on(action, createGenericHandler(handler));
    }

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});


// --- STATIC FILE SERVING ---
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
