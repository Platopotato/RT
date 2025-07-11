import React, { useState, useEffect, useMemo, useContext } from 'react';
import { Tribe, User, GameState, HexData, GameAction, ActionType, DiplomaticStatus, Garrison, DiplomaticRelation } from '../lib/types';
import TribeCreation from './components/TribeCreation';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import MapEditor from './components/MapEditor';
import ForgotPassword from './components/ForgotPassword';
import Leaderboard from './components/Leaderboard';
import TransitionScreen from './components/TransitionScreen';
import LobbyScreen from './components/LobbyScreen';
import * as Auth from './auth';
import { api, events } from './socket';
import { INITIAL_GLOBAL_RESOURCES, INITIAL_GARRISON } from '../lib/constants';
import { getHexesInRange, parseHexCoords } from '../lib/mapUtils';
import { GameStateContext } from './index';

type View = 'login' | 'register' | 'game' | 'admin' | 'create_tribe' | 'map_editor' | 'forgot_password' | 'leaderboard' | 'transition' | 'lobby';

type TribeCreationData = {
    playerName: string;
    tribeName: string;
    icon: string;
    color: string;
    stats: {
        charisma: number;
        intelligence: number;
        leadership: number;
        strength: number;
    };
};

interface AppProps {
  isLoading: boolean;
}

const App: React.FC<AppProps> = ({ isLoading }) => {
  const { gameState } = useContext(GameStateContext);
  const [currentUser, setCurrentUser] = useState<Omit<User, 'passwordHash' | 'securityAnswerHash'> | null>(Auth.getCurrentUser());
  const [view, setView] = useState<View>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  
  // Get the player's tribe from the game state
  const playerTribe = useMemo(() => {
    if (!currentUser || !gameState) return undefined;
    return gameState.tribes.find(t => t.playerId === currentUser.id);
  }, [currentUser, gameState]);

  // Set up event listeners for authentication
  useEffect(() => {
    const unsubscribeLoginSuccess = events.onLoginSuccess((user) => {
      setCurrentUser(user);
      Auth.setCurrentUser(user);
      setLoginError(null);
      
      // Determine which view to show based on user state
      if (gameState?.tribes.some(t => t.playerId === user.id)) {
        setView('game');
      } else if (user.role === 'admin') {
        setView('game');
      } else {
        setView('lobby');
      }
    });

    const unsubscribeLoginFail = events.onLoginFail((message) => {
      setLoginError(message);
    });

    const unsubscribeRegisterFail = events.onRegisterFail((message) => {
      setRegisterError(message);
    });

    const unsubscribeAlert = events.onAlert((message) => {
      alert(message);
    });

    return () => {
      unsubscribeLoginSuccess();
      unsubscribeLoginFail();
      unsubscribeRegisterFail();
      unsubscribeAlert();
    };
  }, [gameState]);

  // Check if user has a tribe and update view accordingly
  useEffect(() => {
    if (isLoading || !currentUser || !gameState) return;

    if (view === 'lobby' && playerTribe) {
      setView('game');
    }
  }, [gameState, playerTribe, currentUser, view, isLoading]);

  // Poll for game state updates when waiting for turn processing
  useEffect(() => {
    if (!playerTribe || !gameState) return;

    let intervalId: number | undefined;
    const isWaiting = playerTribe.turnSubmitted === true;

    if (isWaiting) {
      intervalId = window.setInterval(() => {
        api.getInitialState().catch(console.error);
      }, 8000); // Poll every 8 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [playerTribe?.turnSubmitted, gameState?.turn]);

  const handleLoginSubmit = (username: string, password: string) => {
    setLoginError(null);
    api.login(username, password).catch(() => {
      setLoginError('Connection error. Please try again.');
    });
  };

  const handleRegisterSubmit = (data: { username: string, password: string, securityQuestion: string, securityAnswer: string }) => {
    setRegisterError(null);
    api.register(data).catch(() => {
      setRegisterError('Connection error. Please try again.');
    });
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

    const newTribe: Omit<Tribe, 'id' | 'turnSubmitted' | 'actions' | 'lastTurnResults' | 'exploredHexes' | 'rationLevel' | 'completedTechs' | 'assets' | 'currentResearch' | 'journeyResponses' | 'diplomacy'> = {
      ...tribeData,
      playerId: currentUser.id,
      location: availableStart,
      globalResources: INITIAL_GLOBAL_RESOURCES,
      garrisons: { [availableStart]: { ...INITIAL_GARRISON, chiefs: [] } },
    };
    
    try {
      await api.createTribe(newTribe);
      setView('transition');
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to create tribe:', error);
      alert('Failed to create tribe. Please try again.');
    }
  };
  
  const handleFinalizePlayerTurn = async (tribeId: string, plannedActions: GameAction[], journeyResponses: Tribe['journeyResponses']) => {
    try {
      await api.submitTurn({ tribeId, plannedActions, journeyResponses });
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to submit turn:', error);
      alert('Failed to submit turn. Please try again.');
    }
  };
  
  const handleUpdateTribe = async (updatedTribe: Tribe) => {
    try {
      await api.updateTribe(updatedTribe);
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to update tribe:', error);
      alert('Failed to update tribe. Please try again.');
    }
  };

  const handleProcessGlobalTurn = async () => {
    try {
      setView('transition');
      await api.processTurn();
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to process turn:', error);
      alert('Failed to process turn. Please try again.');
      setView('admin');
    }
  };

  const handleUpdateMap = async (newMapData: HexData[], newStartingLocations: string[]) => {
    try {
      await api.updateMap({ newMapData, newStartingLocations });
      setView('admin');
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to update map:', error);
      alert('Failed to update map. Please try again.');
    }
  };

  const handleRemovePlayer = async (userIdToRemove: string) => {
    try {
      await api.removePlayer(userIdToRemove);
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to remove player:', error);
      alert('Failed to remove player. Please try again.');
    }
  };

  const handleStartNewGame = async () => {
    try {
      await api.startNewGame();
      alert('New game started! All tribes and requests have been removed and the turn has been reset to 1.');
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to start new game:', error);
      alert('Failed to start new game. Please try again.');
    }
  };

  const handleLoadBackup = async (backup: any) => {
    try {
      await api.loadBackup(backup);
      
      if (currentUser) {
        const reloadedUser = backup.users.find((u: User) => u.id === currentUser.id);
        if (reloadedUser) {
          Auth.refreshCurrentUserInSession(reloadedUser);
          setCurrentUser(reloadedUser);
        } else {
          alert('Game state loaded, but your user account was not in the backup. Logging you out.');
          handleLogout();
        }
      }
      
      alert('Game state and all users loaded successfully!');
      // The game state will be updated via socket events
    } catch (error) {
      console.error('Failed to load backup:', error);
      alert('Failed to load backup. Please try again.');
    }
  };

  // Simplified handlers that just call the API
  const handleRequestChief = (tribeId: string, chiefName: string, radixAddressSnippet: string) => 
    api.requestChief({ tribeId, chiefName, radixAddressSnippet }).catch(console.error);
  
  const handleApproveChief = (requestId: string) => 
    api.approveChief(requestId).catch(console.error);
  
  const handleDenyChief = (requestId: string) => 
    api.denyChief(requestId).catch(console.error);
  
  const handleRequestAsset = (tribeId: string, assetName: string, radixAddressSnippet: string) => 
    api.requestAsset({ tribeId, assetName, radixAddressSnippet }).catch(console.error);
  
  const handleApproveAsset = (requestId: string) => 
    api.approveAsset(requestId).catch(console.error);
  
  const handleDenyAsset = (requestId: string) => 
    api.denyAsset(requestId).catch(console.error);
  
  const handleAddAITribe = () => 
    api.addAITribe().catch(console.error);
  
  const handleProposeAlliance = (fromTribeId: string, toTribeId: string) => 
    api.proposeAlliance({ fromTribeId, toTribeId }).catch(console.error);
  
  const handleSueForPeace = (fromTribeId: string, toTribeId: string, reparations: { food: number; scrap: number; weapons: number; }) => 
    api.sueForPeace({ fromTribeId, toTribeId, reparations }).catch(console.error);
  
  const handleAcceptProposal = (proposalId: string) => 
    api.acceptProposal(proposalId).catch(console.error);
  
  const handleRejectProposal = (proposalId: string) => 
    api.rejectProposal(proposalId).catch(console.error);
  
  const handleDeclareWar = (fromTribeId: string, toTribeId: string) => 
    api.declareWar({ fromTribeId, toTribeId }).catch(console.error);

  const renderView = () => {
    if (isLoading || !gameState) {
      return <TransitionScreen message="Loading Wasteland..." />;
    }

    switch (view) {
      case 'login':
        return <Login 
          onLoginSubmit={handleLoginSubmit} 
          onSwitchToRegister={() => setView('register')} 
          onNavigateToForgotPassword={() => setView('forgot_password')} 
          error={loginError}
        />;
      
      case 'register':
        return <Register 
          onRegisterSubmit={handleRegisterSubmit} 
          onSwitchToLogin={() => setView('login')} 
          error={registerError}
        />;

      case 'forgot_password':
        return <ForgotPassword 
          onSuccess={() => setView('login')} 
          onCancel={() => setView('login')} 
        />;

      case 'lobby':
        if (!currentUser) { setView('login'); return null; }
        return <LobbyScreen 
          onTribeCreate={handleTribeCreate} 
          user={currentUser} 
          onLogout={handleLogout}
        />;
      
      case 'create_tribe':
        if (!currentUser) { setView('login'); return null; }
        return <TribeCreation 
          onTribeCreate={handleTribeCreate} 
          user={currentUser} 
        />;
      
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
        />;

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
        if (!playerTribe && currentUser.role !== 'admin') { setView('lobby'); return null; }

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
