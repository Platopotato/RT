


import React from 'react';
import { GlobalResources, POIType, POIRarity } from './types';

export const MAX_STAT_POINTS = 25;
export const MIN_STAT_VALUE = 1;

export const INITIAL_GLOBAL_RESOURCES: GlobalResources = {
  food: 100,
  scrap: 20,
  morale: 50,
};

export const INITIAL_GARRISON = {
  troops: 20,
  weapons: 10,
};

export const TRIBE_ICONS: { [key: string]: React.ReactNode } = {
  skull: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM9 9a1 1 0 011-1h4a1 1 0 110 2h-4a1 1 0 01-1-1zm-1 5a1 1 0 011-1h6a1 1 0 110 2H9a1 1 0 01-1-1zm-2-1a1 1 0 011-1h1a1 1 0 110 2H7a1 1 0 01-1-1zm10-1a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-5-3a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zM9 16.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />,
  wolf: <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-2-9c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm4 0c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1zm-.01 4.5c-1.39 0-2.6-1.04-3.13-2.5h6.27c-.53 1.46-1.74 2.5-3.14 2.5z" />,
  raven: <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-4-8.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5S6.5 13.83 6.5 13 7.17 11.5 8 11.5zm8 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM12 15c-2.33 0-4.31-1.46-5.11-3.5h10.22C16.31 13.54 14.33 15 12 15z" />,
  gear: <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12-.64l2 3.46c.12.22.39.3.61.22l2.49 1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61.22l2-3.46c.12-.22-.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />,
  biohazard: <path d="M12.83,11.17,14,12.34V14a1,1,0,0,1-2,0V12.66l-1.17-1.17a3,3,0,0,1-1.66,0L8,12.66V14a1,1,0,0,1-2,0V12.34L7.17,11.17a3,3,0,0,1,0-4.34L6,5.66V4A1,1,0,0,1,8,4V5.34l1.17,1.17a3,3,0,0,1,1.66,0L12,5.34V4a1,1,0,0,1,2,0V5.66l1.17,1.17a3,3,0,0,1,0,4.34M12,2a10,10,0,1,0,10,10A10,10,0,0,0,12,2Zm0,5a1,1,0,1,0,1,1A1,1,0,0,0,12,7Z"/>,
  spider: <path d="M19,10a1,1,0,0,0-1,1,5,5,0,0,1-4,4.9V12h2a1,1,0,0,0,0-2H14V7h2a1,1,0,0,0,0-2H14V2a1,1,0,0,0-2,0V5H10V2a1,1,0,0,0-2,0V5H6a1,1,0,0,0,0,2H8v3H6a1,1,0,0,0,0,2H8v4.9A5,5,0,0,1,4,11a1,1,0,0,0-2,0,7,7,0,0,0,6,6.9V22a1,1,0,0,0,2,0V17.9a7,7,0,0,0,6-6.9,1,1,0,0,0-1-1Z"/>,
  serpent: <path d="M18.36,8.76a1,1,0,0,0-1.41,0L13,12.71V5a1,1,0,0,0-2,0v7.71L7.05,8.76a1,1,0,0,0-1.41,0,1,1,0,0,0,0,1.41l5.66,5.66a1,1,0,0,0,1.41,0l5.66-5.66A1,1,0,0,0,18.36,8.76Z"/>,
  claw: <path d="M20,17.18V5a3,3,0,0,0-3-3H7A3,3,0,0,0,4,5V17.18a3,3,0,0,0,1.24,2.45l.18.13,6,4.3a.49.49,0,0,0,.56,0l6-4.3.18-.13A3,3,0,0,0,20,17.18ZM8,10a1,1,0,1,1,1,1A1,1,0,0,1,8,10Zm4,0a1,1,0,1,1,1,1A1,1,0,0,1,12,10Zm4,0a1,1,0,1,1,1,1A1,1,0,0,1,16,10Z"/>,
};

export const TRIBE_COLORS: string[] = [
  '#F56565', // Red
  '#4299E1', // Blue
  '#48BB78', // Green
  '#ED8936', // Orange
  '#9F7AEA', // Purple
  '#ECC94B', // Yellow
  '#38B2AC', // Teal
  '#ED64A6', // Pink
  '#A0AEC0', // Gray
  '#667EEA', // Indigo
  '#F687B3', // Fuchsia
  '#D69E2E', // Brown
  '#319795', // Pine
  '#6B46C1', // Violet
  '#C53030', // Dark Red
  '#059669', // Dark Green
];

export const POI_SYMBOLS: { [key in POIType]: string } = {
    [POIType.Scrapyard]: 'S',
    [POIType.FoodSource]: 'F',
    [POIType.WeaponsCache]: 'W',
    [POIType.ResearchLab]: 'R',
    [POIType.Settlement]: 'H',
    [POIType.Outpost]: 'O',
    [POIType.Ruins]: 'X',
    [POIType.BanditCamp]: 'B',
    [POIType.Mine]: 'M',
    [POIType.Vault]: 'V',
    [POIType.Battlefield]: '!',
    [POIType.Factory]: 'C',
    [POIType.Crater]: '◎',
    [POIType.Radiation]: '☣',
};

export const POI_COLORS: { [key in POIType]: { bg: string; text: string } } = {
    [POIType.Scrapyard]: { bg: 'fill-slate-500', text: 'text-white' },
    [POIType.FoodSource]: { bg: 'fill-green-600', text: 'text-white' },
    [POIType.WeaponsCache]: { bg: 'fill-red-600', text: 'text-white' },
    [POIType.ResearchLab]: { bg: 'fill-blue-500', text: 'text-white' },
    [POIType.Settlement]: { bg: 'fill-amber-400', text: 'text-black' },
    [POIType.Outpost]: { bg: 'fill-yellow-700', text: 'text-white' },
    [POIType.Ruins]: { bg: 'fill-purple-600', text: 'text-white' },
    [POIType.BanditCamp]: { bg: 'fill-red-500', text: 'text-white' },
    [POIType.Mine]: { bg: 'fill-orange-800', text: 'text-white' },
    [POIType.Vault]: { bg: 'fill-yellow-400', text: 'text-black' },
    [POIType.Battlefield]: { bg: 'fill-red-800', text: 'text-white' },
    [POIType.Factory]: { bg: 'fill-gray-600', text: 'text-white' },
    [POIType.Crater]: { bg: 'fill-stone-700', text: 'text-white' },
    [POIType.Radiation]: { bg: 'fill-lime-400', text: 'text-black' },
};

export const POI_RARITY_MAP: { [key in POIType]: POIRarity } = {
  [POIType.FoodSource]: 'Common',
  [POIType.Scrapyard]: 'Common',
  [POIType.Ruins]: 'Common',
  [POIType.Outpost]: 'Uncommon',
  [POIType.WeaponsCache]: 'Uncommon',
  [POIType.BanditCamp]: 'Uncommon',
  [POIType.Settlement]: 'Rare',
  [POIType.ResearchLab]: 'Rare',
  [POIType.Mine]: 'Rare',
  [POIType.Factory]: 'Rare',
  [POIType.Battlefield]: 'Rare',
  [POIType.Vault]: 'Very Rare',
  [POIType.Crater]: 'Rare',
  [POIType.Radiation]: 'Very Rare',
};

export const SECURITY_QUESTIONS = [
  "What was your first pet's name?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the model of your first car?",
  "What is the name of your favorite childhood friend?",
];