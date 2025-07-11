// This file simulates a backend server. In a real application, these functions
// would be API endpoints making requests to a database. For this project,
// we use localStorage as our persistent data store.

import { GameState, User, FullBackupState, GameAction, Tribe, ChiefRequest, AssetRequest, DiplomaticProposal, DiplomaticStatus, Garrison, DiplomaticRelation, HexData, POIType, MapSettings, TerrainType } from '../types';
import * as Auth from './auth';
import { processGlobalTurn } from './turnProcessor';
import { getHexesInRange, parseHexCoords } from './mapUtils';
import { ALL_CHIEFS } from './chiefData';
import { getAsset } from './assetData';
import { generateAITribe } from './ai/aiTribeGenerator';
import { generateAIActions } from './ai/aiActions';
import { generateMapData } from './mapGenerator';
import { TRIBE_COLORS } from '../constants';

const GAME_STATE_KEY = 'radix_tribes_gamestate';
const MAP_RADIUS = 40;
const VISIBILITY_RANGE = 2;

const getDefaultMapSettings = (): MapSettings => ({
    biases: {
        [TerrainType.Plains]: 1, [TerrainType.Desert]: 1, [TerrainType.Mountains]: 1,
        [TerrainType.Forest]: 1, [TerrainType.Ruins]: 0.8, [TerrainType.Wasteland]: 1,
        [TerrainType.Water]: 1, [TerrainType.Radiation]: 0.5, [TerrainType.Crater]: 0.7,
        [TerrainType.Swamp]: 0.9,
    }
});

const getDefaultGameState = (): GameState => {
    const mapSeed = Date.now();
    const mapSettings = getDefaultMapSettings();
    const { map, startingLocations } = generateMapData(MAP_RADIUS, mapSeed, mapSettings);
    return {
        mapData: map, tribes: [], turn: 1, startingLocations,
        chiefRequests: [], assetRequests: [], journeys: [], diplomaticProposals: [],
        history: [], mapSeed, mapSettings,
    };
};

function _saveGameState(state: GameState): void {
    try {
        const stateString = JSON.stringify(state);
        localStorage.setItem(GAME_STATE_KEY, stateString);
    } catch (e) {
        console.error("Failed to save game state:", e);
    }
}

function _migrateGameState(rawState: any): GameState {
    let loadedState = JSON.parse(JSON.stringify(rawState));
    if (loadedState.mapData?.length) {
        loadedState.mapData.forEach((hex: any) => {
            if (hex.poi && typeof hex.poi.type === 'string') {
                const poiTypeMap: { [key: string]: POIType } = { 'Ruins': POIType.Ruins, 'Crater': POIType.Crater, 'Radiation': POIType.Radiation };
                if (poiTypeMap[hex.poi.type]) hex.poi.type = poiTypeMap[hex.poi.type];
            }
        });
    }
    if (!loadedState.mapData || loadedState.mapData.length === 0) {
        const seed = loadedState.mapSeed || Date.now();
        const settings = loadedState.mapSettings || getDefaultMapSettings();
        const { map, startingLocations } = generateMapData(MAP_RADIUS, seed, settings);
        loadedState.mapData = map;
        loadedState.startingLocations = startingLocations;
    }
    if (!loadedState.mapSettings?.biases) loadedState.mapSettings = getDefaultMapSettings();
    else {
        const defaultBiases = getDefaultMapSettings().biases;
        for (const key in defaultBiases) if (!loadedState.mapSettings.biases[key]) loadedState.mapSettings.biases[key as TerrainType] = defaultBiases[key as TerrainType];
    }
    if (!loadedState.startingLocations) loadedState.startingLocations = [];
    if (!loadedState.chiefRequests) loadedState.chiefRequests = [];
    if (!loadedState.assetRequests) loadedState.assetRequests = [];
    if (!loadedState.journeys) loadedState.journeys = [];
    if (!loadedState.diplomaticProposals) loadedState.diplomaticProposals = [];
    if (!loadedState.history) loadedState.history = [];
    if (loadedState.pendingTrades) delete loadedState.pendingTrades;
    if (loadedState.returningCaravans) delete loadedState.returningCaravans;
    if (loadedState.tribes?.length) {
        loadedState.tribes = loadedState.tribes.map((tribe: any) => {
            const migratedTribe = { ...tribe, turnSubmitted: tribe.turnSubmitted ?? false, actions: tribe.actions ?? [], lastTurnResults: tribe.lastTurnResults ?? [], rationLevel: tribe.rationLevel ?? 'Normal', journeyResponses: tribe.journeyResponses ?? [], assets: tribe.assets ?? [], color: tribe.color ?? TRIBE_COLORS[Math.floor(Math.random()*TRIBE_COLORS.length)] };
            if (tribe.diplomacy) {
                const newDiplomacy: Record<string, DiplomaticRelation> = {};
                Object.entries(tribe.diplomacy).forEach(([id, val]) => { newDiplomacy[id] = typeof val === 'string' ? { status: val as DiplomaticStatus } : val as DiplomaticRelation; });
                migratedTribe.diplomacy = newDiplomacy;
            } else migratedTribe.diplomacy = {};
            if (tribe.tradeResponses) delete migratedTribe.tradeResponses;
            if (tribe.diplomaticResponses) delete migratedTribe.diplomaticResponses;
            if (tribe.resources && !tribe.garrisons) {
                migratedTribe.globalResources = { food: tribe.resources.food, scrap: tribe.resources.scrap, morale: tribe.resources.morale };
                migratedTribe.garrisons = { [tribe.location]: { troops: tribe.resources.troops, weapons: tribe.resources.weapons, chiefs: [] } };
                delete migratedTribe.resources;
            } else if (!tribe.garrisons) migratedTribe.garrisons = { [tribe.location]: { troops: 0, weapons: 0, chiefs: [] } };
            if (!tribe.exploredHexes) {
                const initialExplored = new Set<string>();
                Object.keys(migratedTribe.garrisons).forEach(loc => {
                    const { q, r } = parseHexCoords(loc);
                    getHexesInRange({ q, r }, VISIBILITY_RANGE).forEach(hex => initialExplored.add(hex));
                });
                migratedTribe.exploredHexes = Array.from(initialExplored);
            }
            if (tribe.chiefs?.length) {
                const homeGarrison = migratedTribe.garrisons[migratedTribe.location];
                if (homeGarrison) homeGarrison.chiefs = [...(homeGarrison.chiefs || []), ...tribe.chiefs];
                delete migratedTribe.chiefs;
            }
            Object.values(migratedTribe.garrisons).forEach((g: any) => { if (!g.chiefs) g.chiefs = []; });
            if (typeof migratedTribe.isAI === 'undefined') { migratedTribe.isAI = false; migratedTribe.aiType = null; }
            return migratedTribe;
        });
        const tribeIds = loadedState.tribes.map((t: Tribe) => t.id);
        loadedState.tribes.forEach((tribe: Tribe) => {
            tribeIds.forEach((otherTribeId: string) => {
                if (tribe.id !== otherTribeId && !tribe.diplomacy[otherTribeId]) {
                    const otherTribe = loadedState.tribes.find((t: Tribe) => t.id === otherTribeId);
                    const initialStatus = (tribe.isAI || otherTribe?.isAI) ? DiplomaticStatus.War : DiplomaticStatus.Neutral;
                    tribe.diplomacy[otherTribeId] = { status: initialStatus };
                }
            });
        });
    }
    return loadedState as GameState;
}

const apiCall = <T>(cb: () => T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(cb()), Math.random() * 100 + 50));

export async function getGameState(): Promise<GameState> {
    return apiCall(() => {
        const stateString = localStorage.getItem(GAME_STATE_KEY);
        if (stateString) return _migrateGameState(JSON.parse(stateString));
        const defaultState = getDefaultGameState();
        _saveGameState(defaultState);
        return defaultState;
    });
}

const createAction = <T>(logic: (state: GameState, payload: T) => GameState) => (payload: T): Promise<GameState> => apiCall(() => {
    const state = _migrateGameState(JSON.parse(localStorage.getItem(GAME_STATE_KEY)!));
    const newState = logic(state, payload);
    _saveGameState(newState);
    return newState;
});

export const updateMap = createAction<{newMapData: HexData[], newStartingLocations: string[]}>((state, {newMapData, newStartingLocations}) => {
    const updatedTribes = state.tribes.map((tribe, index) => {
        const newLocation = newStartingLocations[index] || '000.000';
        const oldLocation = tribe.location;
        const newGarrisons = { ...tribe.garrisons };
        if (newGarrisons[oldLocation] && oldLocation !== newLocation) {
            newGarrisons[newLocation] = newGarrisons[oldLocation];
            delete newGarrisons[oldLocation];
        }
        return { ...tribe, location: newLocation, garrisons: newGarrisons };
    });
    return { ...state, mapData: newMapData, startingLocations: newStartingLocations, tribes: updatedTribes };
});

export const createTribe = createAction<Tribe>((state, newTribeData) => {
    state.tribes.forEach(existingTribe => {
        const initialStatus = existingTribe.isAI ? DiplomaticStatus.War : DiplomaticStatus.Neutral;
        newTribeData.diplomacy[existingTribe.id] = { status: initialStatus };
        existingTribe.diplomacy[newTribeData.id] = { status: initialStatus };
    });
    return { ...state, tribes: [...state.tribes, newTribeData] };
});

export const submitTurn = createAction<{ tribeId: string; plannedActions: GameAction[]; journeyResponses: Tribe['journeyResponses'] }>((state, { tribeId, plannedActions, journeyResponses }) => ({
    ...state,
    tribes: state.tribes.map(t => t.id === tribeId ? { ...t, actions: plannedActions, turnSubmitted: true, journeyResponses } : t)
}));

export async function processTurn(): Promise<GameState> {
    return apiCall(() => {
        let state = _migrateGameState(JSON.parse(localStorage.getItem(GAME_STATE_KEY)!));
        const stateWithAIActions = {
            ...state,
            tribes: state.tribes.map(tribe => {
                if (tribe.isAI && !tribe.turnSubmitted) {
                    return { ...tribe, actions: generateAIActions(tribe, state.tribes, state.mapData), turnSubmitted: true };
                }
                return tribe;
            }),
        };
        const finalState = processGlobalTurn(stateWithAIActions);
        _saveGameState(finalState);
        return finalState;
    });
}

export const updateTribe = createAction<Tribe>((state, updatedTribe) => ({
    ...state,
    tribes: state.tribes.map(t => t.id === updatedTribe.id ? updatedTribe : t)
}));

export const requestChief = createAction<{ tribeId: string; chiefName: string; radixAddressSnippet: string }>((state, payload) => ({
    ...state, chiefRequests: [...(state.chiefRequests || []), { id: `req-${Date.now()}`, ...payload, status: 'pending' }]
}));

export const approveChief = createAction<string>((state, requestId) => {
    const request = state.chiefRequests.find(r => r.id === requestId);
    if (!request || !ALL_CHIEFS.find(c => c.name === request.chiefName)) return state;
    return {
        ...state,
        chiefRequests: state.chiefRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r),
        tribes: state.tribes.map(t => {
            if (t.id === request.tribeId) {
                const homeGarrison = t.garrisons[t.location];
                if (homeGarrison) homeGarrison.chiefs.push(ALL_CHIEFS.find(c => c.name === request.chiefName)!);
            }
            return t;
        })
    };
});
export const denyChief = createAction<string>((state, requestId) => ({ ...state, chiefRequests: state.chiefRequests.map(r => r.id === requestId ? { ...r, status: 'denied' } : r) }));

export const requestAsset = createAction<{ tribeId: string; assetName: string; radixAddressSnippet: string }>((state, payload) => ({
    ...state, assetRequests: [...(state.assetRequests || []), { id: `asset-req-${Date.now()}`, ...payload, status: 'pending' }]
}));

export const approveAsset = createAction<string>((state, requestId) => {
    const request = state.assetRequests.find(r => r.id === requestId);
    if (!request || !getAsset(request.assetName)) return state;
    return {
        ...state,
        assetRequests: state.assetRequests.map(r => r.id === requestId ? { ...r, status: 'approved' } : r),
        tribes: state.tribes.map(t => t.id === request.tribeId ? { ...t, assets: [...(t.assets || []), request.assetName] } : t)
    };
});
export const denyAsset = createAction<string>((state, requestId) => ({ ...state, assetRequests: state.assetRequests.map(r => r.id === requestId ? { ...r, status: 'denied' } : r) }));

export const addAITribe = createAction<void>((state, _payload) => {
    const occupied = new Set(state.tribes.map(t => t.location));
    const start = state.startingLocations.find(loc => !occupied.has(loc));
    if (!start) return state;
    const aiTribe = generateAITribe(start, state.tribes.map(t => t.tribeName));
    state.tribes.forEach(t => {
        aiTribe.diplomacy[t.id] = { status: DiplomaticStatus.War };
        t.diplomacy[aiTribe.id] = { status: DiplomaticStatus.War };
    });
    return { ...state, tribes: [...state.tribes, aiTribe] };
});

export const proposeAlliance = createAction<{ fromTribeId: string; toTribeId: string }>((state, { fromTribeId, toTribeId }) => {
    const fromTribe = state.tribes.find(t => t.id === fromTribeId);
    if (!fromTribe || state.diplomaticProposals.some(p => (p.fromTribeId === fromTribeId && p.toTribeId === toTribeId) || (p.fromTribeId === toTribeId && p.toTribeId === fromTribeId))) return state;
    const newProposal: DiplomaticProposal = { id: `proposal-${Date.now()}`, fromTribeId, toTribeId, statusChangeTo: DiplomaticStatus.Alliance, expiresOnTurn: state.turn + 3, fromTribeName: fromTribe.tribeName };
    return { ...state, diplomaticProposals: [...state.diplomaticProposals, newProposal] };
});

export const sueForPeace = createAction<{ fromTribeId: string; toTribeId: string; reparations: { food: number, scrap: number, weapons: number } }>((state, { fromTribeId, toTribeId, reparations }) => {
    const fromTribe = state.tribes.find(t => t.id === fromTribeId);
    if (!fromTribe) return state;
    const totalWeapons = Object.values(fromTribe.garrisons).reduce((sum: number, g: Garrison) => sum + g.weapons, 0);
    if (fromTribe.globalResources.food < reparations.food || fromTribe.globalResources.scrap < reparations.scrap || totalWeapons < reparations.weapons || state.diplomaticProposals.some(p => (p.fromTribeId === fromTribeId && p.toTribeId === toTribeId) || (p.fromTribeId === toTribeId && p.toTribeId === fromTribeId))) return state;
    const newProposal: DiplomaticProposal = { id: `proposal-${Date.now()}`, fromTribeId, toTribeId, statusChangeTo: DiplomaticStatus.Neutral, expiresOnTurn: state.turn + 3, fromTribeName: fromTribe.tribeName, reparations };
    return { ...state, diplomaticProposals: [...state.diplomaticProposals, newProposal] };
});

export const acceptProposal = createAction<string>((state, proposalId) => {
    const proposal = state.diplomaticProposals.find(p => p.id === proposalId);
    if (!proposal) return state;
    const fromTribeIdx = state.tribes.findIndex(t => t.id === proposal.fromTribeId), toTribeIdx = state.tribes.findIndex(t => t.id === proposal.toTribeId);
    if (fromTribeIdx === -1 || toTribeIdx === -1) return state;
    
    const tribes: Tribe[] = JSON.parse(JSON.stringify(state.tribes));
    const fromTribe = tribes[fromTribeIdx], toTribe = tribes[toTribeIdx];
    let truceUntil: number | undefined;

    if (proposal.statusChangeTo === DiplomaticStatus.Neutral && proposal.reparations) {
        const rep = proposal.reparations;
        const totalW = Object.values(fromTribe.garrisons).reduce((s: number, g: Garrison) => s + g.weapons, 0);
        if (fromTribe.globalResources.food < rep.food || fromTribe.globalResources.scrap < rep.scrap || totalW < rep.weapons) {
            return { ...state, diplomaticProposals: state.diplomaticProposals.filter(p => p.id !== proposalId) };
        }
        fromTribe.globalResources.food -= rep.food;
        toTribe.globalResources.food += rep.food;
        fromTribe.globalResources.scrap -= rep.scrap;
        toTribe.globalResources.scrap += rep.scrap;
        let weaponsToTake = rep.weapons;
        for (const loc in fromTribe.garrisons) { if (weaponsToTake <= 0) break; const taken = Math.min(weaponsToTake, fromTribe.garrisons[loc].weapons); fromTribe.garrisons[loc].weapons -= taken; weaponsToTake -= taken; }
        toTribe.garrisons[toTribe.location].weapons += rep.weapons;
        truceUntil = state.turn + 5;
    }
    fromTribe.diplomacy[toTribe.id] = { status: proposal.statusChangeTo, truceUntilTurn: truceUntil };
    toTribe.diplomacy[fromTribe.id] = { status: proposal.statusChangeTo, truceUntilTurn: truceUntil };
    return { ...state, tribes, diplomaticProposals: state.diplomaticProposals.filter(p => p.id !== proposalId) };
});

export const rejectProposal = createAction<string>((state, proposalId) => ({ ...state, diplomaticProposals: state.diplomaticProposals.filter(p => p.id !== proposalId) }));

export const declareWar = createAction<{ fromTribeId: string; toTribeId: string }>((state, { fromTribeId, toTribeId }) => {
    const fromTribe = state.tribes.find(t => t.id === fromTribeId);
    if (fromTribe) {
        const relation = fromTribe.diplomacy[toTribeId];
        if (relation?.truceUntilTurn && relation.truceUntilTurn > state.turn) return state;
    }
    const tribes = state.tribes.map(t => {
        if (t.id === fromTribeId) return { ...t, diplomacy: { ...t.diplomacy, [toTribeId]: { status: DiplomaticStatus.War } } };
        if (t.id === toTribeId) return { ...t, diplomacy: { ...t.diplomacy, [fromTribeId]: { status: DiplomaticStatus.War } } };
        return t;
    });
    return { ...state, tribes };
});

export const startNewGame = createAction<void>((state, _payload) => ({ ...state, tribes: [], chiefRequests: [], assetRequests: [], journeys: [], turn: 1, diplomaticProposals: [], history: [] }));

export const removePlayer = createAction<string>((state, userIdToRemove) => {
    Auth.removeUser(userIdToRemove);
    return { ...state, tribes: state.tribes.filter(t => t.playerId !== userIdToRemove) };
});

export const loadBackup = createAction<FullBackupState>((state, backup) => {
    Auth.replaceAllUsers(backup.users);
    return _migrateGameState(backup.gameState);
});