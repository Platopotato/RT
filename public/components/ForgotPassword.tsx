import React, { useState } from 'react';
import * as Auth from '../lib/auth';
import Card from './ui/Card';
import Button from './ui/Button';

interface ForgotPasswordProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const ForgotPassword: React.FC<ForgotPasswordProps> = ({ onSuccess, onCancel }) => {
  const [username, setUsername] = useState('');

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    Auth.getUserQuestion(username);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-slate-900">
      <Card title="Password Recovery" className="max-w-sm w-full">
          <form onSubmit={handleUsernameSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center text-amber-400">Find Your Account</h2>
            <div>
              <label htmlFor="username-forgot" className="block text-sm font-medium text-slate-300 mb-1">Username</label>
              <input type="text" id="username-forgot" value={username} onChange={e => setUsername(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200" />
            </div>
            <p className="text-xs text-slate-400 text-center">Submit your username to receive your security question via a prompt.</p>
            <Button type="submit" className="w-full">Find Account</Button>
             <p className="text-sm text-center text-slate-400 pt-4 border-t border-slate-700">
                Remember your password?{' '}
                <button type="button" onClick={onCancel} className="font-medium text-amber-500 hover:text-amber-400">
                Back to Login
                </button>
            </p>
          </form>
      </Card>
    </div>
  );
};

export default ForgotPassword;