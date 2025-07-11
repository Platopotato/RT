import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { api, events } from './socket';
import * as Auth from './auth';
import './index.css';

// Create a context for game state
import { createContext, useState, useEffect } from 'react';
import { GameState, User } from '../lib/types';

// Create contexts for game state and user
export const GameStateContext = createContext<{
  gameState: GameState | null;
  users: Omit<User, 'passwordHash' | 'securityAnswerHash'>[];
}>({
  gameState: null,
  users: [],
});

// Root component that provides game state context
const Root: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [users, setUsers] = useState<Omit<User, 'passwordHash' | 'securityAnswerHash'>[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up event listeners for socket events
    const unsubscribeGameState = events.onGameStateUpdated((state) => {
      setGameState(state);
      setIsLoading(false);
    });

    const unsubscribeUsers = events.onUsersUpdated((updatedUsers) => {
      setUsers(updatedUsers);
    });

    const unsubscribeInitialState = events.onInitialState((data) => {
      setGameState(data.gameState);
      setUsers(data.users);
      setIsLoading(false);
    });

    // Request initial state
    api.getInitialState().catch((error) => {
      console.error('Failed to get initial state:', error);
      setIsLoading(false);
    });

    // Clean up event listeners
    return () => {
      unsubscribeGameState();
      unsubscribeUsers();
      unsubscribeInitialState();
    };
  }, []);

  return (
    <GameStateContext.Provider value={{ gameState, users }}>
      <App isLoading={isLoading} />
    </GameStateContext.Provider>
  );
};

// Create root and render app
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
