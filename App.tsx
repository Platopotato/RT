

import React, { useState, useEffect, useMemo } from 'react';
import { Tribe, User, GameState, HexData, GameAction, TribeStats, FullBackupState, ChiefRequest, AssetRequest, ActionType, DiplomaticProposal, DiplomaticStatus, Garrison, DiplomaticRelation } from './types';
import TribeCreation from './components/TribeCreation';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import MapEditor from './components/MapEditor';
import ForgotPassword from './components/ForgotPassword';
import Leaderboard from './components/Leaderboard';
import TransitionScreen from './components/TransitionScreen';
import * as Auth from './lib/auth';
import * as server from './lib/server';
import { INITIAL_GLOBAL_RESOURCES, INITIAL_GARRISON } from './constants';
import { getHexesInRange, parseHexCoords } from './lib/mapUtils';

type View = 'login' | 'register' | 'game' | 'admin' | 'create_tribe' | 'map_editor' | 'forgot_password' | 'leaderboard' | 'transition';

type TribeCreationData = {
    playerName: string;
    tribeName: string;
    icon: string;
    color: string;
    stats: TribeStats;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [view, setView] = useState<View>('login');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const user = Auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    server.getGameState().then(initialState => {
      setGameState(initialState);
      setIsLoading(false);
    });
  }, []);
  
  const playerTribe = useMemo(() => {
    if (!currentUser || !gameState) return undefined;
    return gameState.tribes.find(t => t.playerId === currentUser.id);
  }, [currentUser, gameState]);

  useEffect(() => {
    if (isLoading || !currentUser || !gameState) return;

    if (view === 'create_tribe' && playerTribe) {
        setView('game');
    }
  }, [gameState, playerTribe, currentUser, view, isLoading]);

  useEffect(() => {
    if (!playerTribe || !gameState) return;

    let intervalId: number | undefined;
    const isWaiting = playerTribe.turnSubmitted === true;

    if (isWaiting) {
        intervalId = window.setInterval(async () => {
            const latestGameState = await server.getGameState();
            if (latestGameState.turn > gameState.turn) {
                setGameState(latestGameState);
                // View will automatically update based on new turn data in main render logic
            }
        }, 8000); // Poll every 8 seconds
    }

    return () => {
        if (intervalId) {
            clearInterval(intervalId);
        }
    };
}, [playerTribe?.turnSubmitted, gameState?.turn]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    const userTribe = gameState?.tribes.find(t => t.playerId === user.id);
    if (userTribe) {
      setView('game');
    } else if (user.role !== 'admin') {
      setView('create_tribe');
    } else {
      setView('game');
    }
  };

  const handleRegisterSuccess = (user: User) => {
    handleLoginSuccess(user);
  };

  const handleLogout = () => {
    Auth.logout();
    setCurrentUser(null);
    setView('login');
  };

  const handleTribeCreate = async (tribeData: TribeCreationData) => {
    if (!currentUser || !gameState) return;

    const occupiedLocations = new Set(gameState.tribes.map(t => t.location));
    const availableStart = gameState.startingLocations.find(loc => !occupiedLocations.has(loc));
    
    if (!availableStart) {
      alert("The admin has not set any available starting locations for new players. Please contact the administrator.");
      return;
    }

    const startCoords = parseHexCoords(availableStart);
    const initialExplored = getHexesInRange(startCoords, 2);

    const newTribe: Tribe = {
      ...tribeData,
      id: `tribe-${Date.now()}`,
      playerId: currentUser.id,
      location: availableStart,
      globalResources: INITIAL_GLOBAL_RESOURCES,
      garrisons: { [availableStart]: { ...INITIAL_GARRISON, chiefs: [] } },
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
    
    const newState = await server.createTribe(newTribe);
    setGameState(newState);
  };
  
  const handleFinalizePlayerTurn = async (tribeId: string, plannedActions: GameAction[], journeyResponses: Tribe['journeyResponses']) => {
    const newState = await server.submitTurn({ tribeId, plannedActions, journeyResponses });
    setGameState(newState);
  };
  
  const handleUpdateTribe = async (updatedTribe: Tribe) => {
    const newState = await server.updateTribe(updatedTribe);
    setGameState(newState);
  };

  const handleProcessGlobalTurn = async () => {
      const newState = await server.processTurn();
      setGameState(newState);
  };

  const handleUpdateMap = async (newMapData: HexData[], newStartingLocations: string[]) => {
    const newState = await server.updateMap({ newMapData, newStartingLocations });
    setGameState(newState);
    setView('admin');
  };

  const handleRemovePlayer = async (userIdToRemove: string) => {
    const newState = await server.removePlayer(userIdToRemove);
    setGameState(newState);
  };

  const handleStartNewGame = async () => {
    const newState = await server.startNewGame();
    setGameState(newState);
    alert('New game started! All tribes and requests have been removed and the turn has been reset to 1.');
  };

  const handleLoadBackup = async (backup: FullBackupState) => {
    const newState = await server.loadBackup(backup);
    
    if (currentUser) {
        const reloadedUser = backup.users.find(u => u.id === currentUser.id);
        if (reloadedUser) {
            Auth.refreshCurrentUserInSession(reloadedUser);
            setCurrentUser(reloadedUser);
        } else {
            alert('Game state loaded, but your user account was not in the backup. Logging you out.');
            handleLogout();
        }
    }
    
    setGameState(newState);
    alert('Game state and all users loaded successfully!');
  };

  // The following functions now just call the server and update state
  const handleRequestChief = (tribeId: string, chiefName: string, radixAddressSnippet: string) => server.requestChief({ tribeId, chiefName, radixAddressSnippet }).then(setGameState);
  const handleApproveChief = (requestId: string) => server.approveChief(requestId).then(setGameState);
  const handleDenyChief = (requestId: string) => server.denyChief(requestId).then(setGameState);
  const handleRequestAsset = (tribeId: string, assetName: string, radixAddressSnippet: string) => server.requestAsset({ tribeId, assetName, radixAddressSnippet }).then(setGameState);
  const handleApproveAsset = (requestId: string) => server.approveAsset(requestId).then(setGameState);
  const handleDenyAsset = (requestId: string) => server.denyAsset(requestId).then(setGameState);
  const handleAddAITribe = () => server.addAITribe().then(setGameState);
  const handleProposeAlliance = (fromTribeId: string, toTribeId: string) => server.proposeAlliance({ fromTribeId, toTribeId }).then(setGameState);
  const handleSueForPeace = (fromTribeId: string, toTribeId: string, reparations: { food: number; scrap: number; weapons: number; }) => server.sueForPeace({ fromTribeId, toTribeId, reparations }).then(setGameState);
  const handleAcceptProposal = (proposalId: string) => server.acceptProposal(proposalId).then(setGameState);
  const handleRejectProposal = (proposalId: string) => server.rejectProposal(proposalId).then(setGameState);
  const handleDeclareWar = (fromTribeId: string, toTribeId: string) => server.declareWar({ fromTribeId, toTribeId }).then(setGameState);

  const renderView = () => {
    if (isLoading || !gameState) {
      return <TransitionScreen message="Loading Wasteland..." />;
    }

    switch (view) {
      case 'login':
        return <Login onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setView('register')} onNavigateToForgotPassword={() => setView('forgot_password')} />;
      
      case 'register':
        return <Register onRegisterSuccess={handleRegisterSuccess} onSwitchToLogin={() => setView('login')} />;

      case 'forgot_password':
        return <ForgotPassword onSuccess={() => setView('login')} onCancel={() => setView('login')} />;

      case 'create_tribe':
        if (!currentUser) { setView('login'); return null; }
        return <TribeCreation onTribeCreate={handleTribeCreate} user={currentUser} />;
      
      case 'transition':
        return <TransitionScreen message={'Synchronizing World...'} />;

      case 'admin':
        if (!currentUser || currentUser.role !== 'admin') { setView('login'); return null; }
        return <AdminPanel 
            gameState={gameState}
            onBack={() => setView('game')} 
            onNavigateToEditor={() => setView('map_editor')}
            onProcessTurn={handleProcessGlobalTurn}
            onRemovePlayer={handleRemovePlayer}
            onStartNewGame={handleStartNewGame}
            onLoadBackup={handleLoadBackup}
            onApproveChief={handleApproveChief}
            onDenyChief={handleDenyChief}
            onApproveAsset={handleApproveAsset}
            onDenyAsset={handleDenyAsset}
            onAddAITribe={handleAddAITribe}
        />;
      
      case 'map_editor':
        if (!currentUser || currentUser.role !== 'admin') { setView('login'); return null; }
        return <MapEditor 
          initialMapData={gameState.mapData}
          initialMapSettings={gameState.mapSettings}
          initialMapSeed={gameState.mapSeed}
          initialStartLocations={gameState.startingLocations}
          onSave={handleUpdateMap}
          onCancel={() => setView('admin')}
        />

      case 'leaderboard':
        if (!currentUser) { setView('login'); return null; }
        return <Leaderboard 
            gameState={gameState}
            playerTribe={playerTribe}
            onBack={() => setView('game')}
          />;

      case 'game':
      default:
        if (!currentUser) { setView('login'); return null; }
        if (!playerTribe && currentUser.role !== 'admin') { setView('create_tribe'); return null; }

        return (
          <Dashboard
            currentUser={currentUser}
            playerTribe={playerTribe}
            allTribes={gameState.tribes}
            turn={gameState.turn}
            mapData={gameState.mapData}
            startingLocations={gameState.startingLocations}
            allChiefRequests={gameState.chiefRequests || []}
            allAssetRequests={gameState.assetRequests || []}
            journeys={gameState.journeys || []}
            diplomaticProposals={gameState.diplomaticProposals || []}
            onFinalizeTurn={(actions, journeyResponses) => playerTribe && handleFinalizePlayerTurn(playerTribe.id, actions, journeyResponses)}
            onRequestChief={(chiefName, address) => playerTribe && handleRequestChief(playerTribe.id, chiefName, address)}
            onRequestAsset={(assetName, address) => playerTribe && handleRequestAsset(playerTribe.id, assetName, address)}
            onUpdateTribe={handleUpdateTribe}
            onLogout={handleLogout}
            onNavigateToAdmin={() => setView('admin')}
            onNavigateToLeaderboard={() => setView('leaderboard')}
            onProposeAlliance={(toTribeId) => playerTribe && handleProposeAlliance(playerTribe.id, toTribeId)}
            onSueForPeace={(toTribeId, reparations) => playerTribe && handleSueForPeace(playerTribe.id, toTribeId, reparations)}
            onDeclareWar={(toTribeId) => playerTribe && handleDeclareWar(playerTribe.id, toTribeId)}
            onAcceptProposal={handleAcceptProposal}
            onRejectProposal={handleRejectProposal}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-0 sm:p-0 lg:p-0">
      <div className="max-w-full">
        {renderView()}
      </div>
    </div>
  );
};

export default App;