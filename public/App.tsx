import React, { useState, useEffect, useMemo } from 'react';
import { Tribe, User, GameState, HexData, GameAction, TribeStats, FullBackupState, DiplomaticProposal } from './types';
import TribeCreation from './components/TribeCreation';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AdminPanel from './components/AdminPanel';
import MapEditor from './components/MapEditor';
import ForgotPassword from './components/ForgotPassword';
import Leaderboard from './components/Leaderboard';
import TransitionScreen from './components/TransitionScreen';
import * as client from './lib/client';
import { getCurrentUser, logout as localLogout, refreshCurrentUserInSession } from './lib/auth';

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
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [view, setView] = useState<View>('login');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const playerTribe = useMemo(() => {
    if (!currentUser || !gameState) return undefined;
    return gameState.tribes.find(t => t.playerId === currentUser.id);
  }, [currentUser, gameState]);

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
  
  const handleStateUpdate = (newState: GameState) => {
      setGameState(newState);
      if (isLoading) setIsLoading(false);
  };
  
  useEffect(() => {
    const userInSession = getCurrentUser();
    if(userInSession) setCurrentUser(userInSession);
    
    client.initClient(handleStateUpdate, setAllUsers, handleLoginSuccess);
  }, []);

  useEffect(() => {
    if (isLoading || !currentUser || !gameState) return;

    if (view === 'create_tribe' && playerTribe) {
        setView('game');
    }
  }, [gameState, playerTribe, currentUser, view, isLoading]);

  const handleRegisterSuccess = (user: User) => {
    handleLoginSuccess(user);
  };

  const handleLogout = () => {
    localLogout();
    setCurrentUser(null);
    setView('login');
  };

  const handleTribeCreate = (tribeData: TribeCreationData) => {
      if (!currentUser) return;
      client.createTribe({ ...tribeData, playerId: currentUser.id });
  };
  
  const handleFinalizePlayerTurn = (tribeId: string, plannedActions: GameAction[], journeyResponses: Tribe['journeyResponses']) => {
      client.submitTurn({ tribeId, plannedActions, journeyResponses });
  };
  
  const handleUpdateTribe = (updatedTribe: Tribe) => client.updateTribe(updatedTribe);
  const handleProcessGlobalTurn = () => client.processTurn();
  const handleUpdateMap = (newMapData: HexData[], newStartingLocations: string[]) => {
      client.updateMap({ newMapData, newStartingLocations });
      setView('admin');
  };

  const handleRemovePlayer = (userIdToRemove: string) => client.removePlayer(userIdToRemove);
  const handleStartNewGame = () => {
      client.startNewGame();
      alert('New game started! All tribes and requests have been removed and the turn has been reset to 1.');
  };
  const handleLoadBackup = (backup: FullBackupState) => {
      client.loadBackup(backup);
      if (currentUser) {
        const reloadedUser = backup.users.find(u => u.id === currentUser.id);
        if (reloadedUser) {
            refreshCurrentUserInSession(reloadedUser);
            setCurrentUser(reloadedUser);
        } else {
            alert('Game state loaded, but your user account was not in the backup. Logging you out.');
            handleLogout();
        }
    }
    alert('Game state and all users loaded successfully!');
  };

  const renderView = () => {
    if (isLoading || !gameState) {
      return <TransitionScreen message="Connecting to Wasteland Server..." />;
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
        return <TribeCreation onTribeCreate={handleTribeCreate} user={currentUser} startingLocations={gameState.startingLocations} tribes={gameState.tribes}/>;
      
      case 'transition':
        return <TransitionScreen message={'Synchronizing World...'} />;

      case 'admin':
        if (!currentUser || currentUser.role !== 'admin') { setView('login'); return null; }
        return <AdminPanel 
            gameState={gameState}
            allUsers={allUsers}
            currentUser={currentUser}
            onBack={() => setView('game')} 
            onNavigateToEditor={() => setView('map_editor')}
            onProcessTurn={handleProcessGlobalTurn}
            onRemovePlayer={handleRemovePlayer}
            onStartNewGame={handleStartNewGame}
            onLoadBackup={handleLoadBackup}
            onApproveChief={client.approveChief}
            onDenyChief={client.denyChief}
            onApproveAsset={client.approveAsset}
            onDenyAsset={client.denyAsset}
            onAddAITribe={client.addAITribe}
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
            onRequestChief={(chiefName, address) => playerTribe && client.requestChief({ tribeId: playerTribe.id, chiefName, radixAddressSnippet: address })}
            onRequestAsset={(assetName, address) => playerTribe && client.requestAsset({ tribeId: playerTribe.id, assetName, radixAddressSnippet: address })}
            onUpdateTribe={handleUpdateTribe}
            onLogout={handleLogout}
            onNavigateToAdmin={() => setView('admin')}
            onNavigateToLeaderboard={() => setView('leaderboard')}
            onProposeAlliance={(toTribeId) => playerTribe && client.proposeAlliance({ fromTribeId: playerTribe.id, toTribeId})}
            onSueForPeace={(toTribeId, reparations) => playerTribe && client.sueForPeace({ fromTribeId: playerTribe.id, toTribeId, reparations })}
            onDeclareWar={(toTribeId) => playerTribe && client.declareWar({ fromTribeId: playerTribe.id, toTribeId })}
            onAcceptProposal={client.acceptProposal}
            onRejectProposal={client.rejectProposal}
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