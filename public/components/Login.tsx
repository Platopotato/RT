import React, { useState } from 'react';
import * as Auth from '../lib/auth';
import { User } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
  onSwitchToRegister: () => void;
  onNavigateToForgotPassword: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onSwitchToRegister, onNavigateToForgotPassword }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    Auth.login(username, password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
      <img
        src="https://www.platopotato.com/NFT/Tribes/logotribesban.png"
        
        alt="Tribes Logo"
        className="w-auto h-20 mb-6"
      />
      <Card className="max-w-sm w-full">
        <form onSubmit={handleLogin} className="space-y-4">
          <h1 className="text-2xl font-bold text-center text-amber-400">Login</h1>
          <p className="text-slate-400 text-center text-sm">Enter your credentials to join the wasteland.</p>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
              placeholder="eg., Platopotato.."
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Password"
              required
            />
          </div>
          <div className="text-right text-sm">
            <button type="button" onClick={onNavigateToForgotPassword} className="font-medium text-amber-500 hover:text-amber-400">
                Forgot Password?
            </button>
          </div>
          <Button type="submit" className="w-full">
            Enter the Wasteland
          </Button>
           <p className="text-sm text-center text-slate-400">
            Don't have an account?{' '}
            <button type="button" onClick={onSwitchToRegister} className="font-medium text-amber-500 hover:text-amber-400">
              Register
            </button>
          </p>
          <div className="text-center text-sm pt-4 border-t border-slate-700 flex justify-center space-x-4">
              <a href="https://www.wearemonstas.com/radix-tribes" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-500 hover:text-amber-400">
                Website
              </a>
              <a href="https://t.me/WeAreMonstas" target="_blank" rel="noopener noreferrer" className="font-medium text-amber-500 hover:text-amber-400">
                Telegram Group
              </a>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default Login;