import React, { useState, useRef } from 'react';
import { Tribe, User, GameState, FullBackupState, ChiefRequest, AssetRequest } from '../types';
import Card from './ui/Card';
import Button from './ui/Button';
import ConfirmationModal from './ui/ConfirmationModal';
import * as Auth from '../lib/auth';

interface AdminPanelProps {
  gameState: GameState;
  onBack: () => void;
  onNavigateToEditor: () => void;
  onProcessTurn: () => void;
  onRemovePlayer: (userId: string) => void;
  onStartNewGame: () => void;
  onLoadBackup: (backup: FullBackupState) => void;
  onApproveChief: (requestId: string) => void;
  onDenyChief: (requestId: string) => void;
  onApproveAsset: (requestId: string) => void;
  onDenyAsset: (requestId: string) => void;
  onAddAITribe: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
  const { gameState, onBack, onNavigateToEditor, onProcessTurn, onRemovePlayer, onStartNewGame, onLoadBackup, onApproveChief, onDenyChief, onApproveAsset, onDenyAsset, onAddAITribe } = props;
  const { tribes: allTribes, chiefRequests, assetRequests } = gameState;
  const allUsers = Auth.getAllUsers();
  const currentUser = Auth.getCurrentUser();
  
  const [userToRemove, setUserToRemove] = useState<User | null>(null);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const handleConfirmRemove = () => {
    if (userToRemove) {
      onRemovePlayer(userToRemove.id);
      setUserToRemove(null);
    }
  };

  const handleConfirmNewGame = () => {
    onStartNewGame();
    setShowNewGameConfirm(false);
  };

  const handleSaveBackup = () => {
    const backupState: FullBackupState = {
        gameState: gameState,
        users: allUsers
    };
    const stateString = JSON.stringify(backupState, null, 2);
    const blob = new Blob([stateString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `radix-tribes-backup-${date}.json`;
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadBackupClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error('Invalid file format');
        const loadedData = JSON.parse(text);

        if (loadedData.gameState && loadedData.users && Array.isArray(loadedData.users)) {
          onLoadBackup(loadedData as FullBackupState);
        } else {
          throw new Error('File does not appear to be a valid full game state backup.');
        }
      } catch (error) {
        console.error('Failed to load game state:', error);
        alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  const pendingChiefRequests = (chiefRequests || []).filter(r => r.status === 'pending');
  const pendingAssetRequests = (assetRequests || []).filter(r => r.status === 'pending');
  const aiTribesCount = allTribes.filter(t => t.isAI).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
          <Button onClick={onBack}>Back to Game</Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-6 lg:col-span-2">
            <Card title="Turn Status">
              <div className="space-y-4">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-slate-700 sticky top-0 bg-neutral-900">
                            <th className="p-2">Tribe Name</th>
                            <th className="p-2">Player</th>
                            <th className="p-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allTribes.map(tribe => (
                            <tr key={tribe.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                              <td className="p-2 font-semibold">{tribe.tribeName} {tribe.isAI && '(AI)'}</td>
                              <td className="p-2 text-slate-400">{tribe.playerName}</td>
                              <td className="p-2">
                                {tribe.turnSubmitted ? (
                                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-300 rounded-full">Submitted</span>
                                ) : (
                                    <span className="px-2 py-1 text-xs font-semibold text-yellow-800 bg-yellow-300 rounded-full">Planning</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                    </table>
                  </div>
                  <div className="pt-4 border-t border-slate-700">
                    <Button onClick={onProcessTurn} className="w-full bg-green-700 hover:bg-green-600">
                        Process All Turns
                    </Button>
                  </div>
              </div>
            </Card>

            <Card title="Pending Asset Approvals">
                <div className="overflow-x-auto max-h-96">
                    {pendingAssetRequests.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 sticky top-0 bg-neutral-900">
                                    <th className="p-2">Tribe</th>
                                    <th className="p-2">Asset Name</th>
                                    <th className="p-2">Radix Addr.</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingAssetRequests.map(req => {
                                    const tribe = allTribes.find(t => t.id === req.tribeId);
                                    return (
                                        <tr key={req.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-2 font-semibold">{tribe?.tribeName || 'Unknown Tribe'}</td>
                                            <td className="p-2">{req.assetName}</td>
                                            <td className="p-2 font-mono text-xs">{req.radixAddressSnippet}</td>
                                            <td className="p-2 space-x-2">
                                                <Button onClick={() => onApproveAsset(req.id)} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1">Approve</Button>
                                                <Button onClick={() => onDenyAsset(req.id)} className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1">Deny</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-slate-400 text-center p-4">No pending asset requests.</p>
                    )}
                </div>
            </Card>

             <Card title="Pending Chief Approvals">
                <div className="overflow-x-auto max-h-96">
                    {pendingChiefRequests.length > 0 ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-700 sticky top-0 bg-neutral-900">
                                    <th className="p-2">Tribe</th>
                                    <th className="p-2">Chief Name</th>
                                    <th className="p-2">Radix Addr.</th>
                                    <th className="p-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingChiefRequests.map(req => {
                                    const tribe = allTribes.find(t => t.id === req.tribeId);
                                    return (
                                        <tr key={req.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                            <td className="p-2 font-semibold">{tribe?.tribeName || 'Unknown Tribe'}</td>
                                            <td className="p-2">{req.chiefName}</td>
                                            <td className="p-2 font-mono text-xs">{req.radixAddressSnippet}</td>
                                            <td className="p-2 space-x-2">
                                                <Button onClick={() => onApproveChief(req.id)} className="text-xs bg-green-700 hover:bg-green-600 px-2 py-1">Approve</Button>
                                                <Button onClick={() => onDenyChief(req.id)} className="text-xs bg-red-800 hover:bg-red-700 px-2 py-1">Deny</Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-slate-400 text-center p-4">No pending chief requests.</p>
                    )}
                </div>
            </Card>

            <Card title="Registered Users">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 sticky top-0 bg-neutral-900">
                        <th className="p-2">Username</th>
                        <th className="p-2">Role</th>
                        <th className="p-2">User ID</th>
                        <th className="p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map(user => (
                        <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-2 font-semibold">{user.username}</td>
                          <td className="p-2 text-slate-400 capitalize">{user.role}</td>
                          <td className="p-2 font-mono text-xs">{user.id}</td>
                          <td className="p-2">
                            {user.role === 'player' && user.id !== currentUser.id && (
                                <Button 
                                    onClick={() => setUserToRemove(user)}
                                    className="bg-red-800 hover:bg-red-700 text-xs py-1 px-2"
                                >
                                    Remove
                                </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </Card>
          </div>
          
          <div className="space-y-6">
            <Card title="World Management">
                <div className="space-y-4">
                    <p className="text-sm text-slate-400">Edit the game world directly or start a new game on the current map.</p>
                    <Button className="w-full" onClick={onNavigateToEditor}>
                      Edit World Map
                    </Button>
                     <Button 
                        className="w-full bg-orange-700 hover:bg-orange-600"
                        onClick={() => setShowNewGameConfirm(true)}
                    >
                        Start New Game
                    </Button>
                </div>
            </Card>
            
            <Card title="AI Management">
              <div className="space-y-4">
                  <p className="text-sm text-slate-400">Add or manage computer-controlled tribes. There are currently {aiTribesCount} AI tribes in the game.</p>
                  <Button className="w-full" onClick={onAddAITribe}>
                    Add Wanderer AI Tribe
                  </Button>
              </div>
            </Card>
            
            <Card title="Game Data Management">
              <div className="space-y-4">
                  <p className="text-sm text-slate-400">Save the entire game state and all users to a file, or load a previous backup.</p>
                  <Button className="w-full" variant="secondary" onClick={handleSaveBackup}>
                    Save Game Backup
                  </Button>
                  <Button className="w-full" variant="secondary" onClick={handleLoadBackupClick}>
                    Load Game Backup
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
              </div>
            </Card>

             <Card title="All Tribes">
              {allTribes.length > 0 ? (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 sticky top-0 bg-neutral-900">
                        <th className="p-2">Tribe Name</th>
                        <th className="p-2">Location</th>
                        <th className="p-2">Troops</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTribes.map(tribe => (
                        <tr key={tribe.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-2 font-semibold">{tribe.tribeName} {tribe.isAI && '(AI)'}</td>
                          <td className="p-2 font-mono">{tribe.location}</td>
                          <td className="p-2">{Object.values(tribe.garrisons).reduce((total, garrison) => total + garrison.troops, 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-slate-400 text-center p-4">No tribes have been founded yet.</p>
              )}
            </Card>
          </div>
        </div>
      </div>
      {userToRemove && (
        <ConfirmationModal
          title={`Remove ${userToRemove.username}?`}
          message="This will permanently delete the user and their associated tribe. This action cannot be undone."
          onConfirm={handleConfirmRemove}
          onCancel={() => setUserToRemove(null)}
        />
      )}
      {showNewGameConfirm && (
        <ConfirmationModal
            title="Start a New Game?"
            message="This will remove ALL current tribes and requests, and reset the turn to 1. The map will be preserved. Are you sure?"
            onConfirm={handleConfirmNewGame}
            onCancel={() => setShowNewGameConfirm(false)}
        />
      )}
    </div>
  );
};

export default AdminPanel;