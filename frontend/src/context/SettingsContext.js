import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SettingsContext = createContext(null);

const DEFAULTS = {
  currency_code: 'USD',
  currency_symbol: '$',
  currency_name: 'US Dollar'
};

export const SettingsProvider = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      if (response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Loaded whenever somebody signs in, not only when the app first opens. Opened on the login
  // page there was no token yet, so nothing was loaded, and after signing in the app showed the
  // built-in US Dollar instead of the saved currency - which looked like the currency "changing
  // back" every time anybody logged out and in again. Signing out resets to the defaults, so one
  // person's settings never sit on screen for the next.
  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      fetchSettings();
    } else {
      setSettings(DEFAULTS);
      setLoading(false);
    }
  }, [user?.id, fetchSettings]);

  const updateSettings = async (newSettings) => {
    try {
      const response = await api.put('/settings', newSettings);
      setSettings(response.data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `${settings.currency_symbol}${formatted}`;
  };

  const categories     = settings.categories || [];
  const incomeCategories  = categories.filter(c => c.type === 'INCOME').map(c => c.name);
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE').map(c => c.name);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, fetchSettings, formatCurrency, loading, categories, incomeCategories, expenseCategories }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
