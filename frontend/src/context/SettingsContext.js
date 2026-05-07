import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    currency_code: 'USD',
    currency_symbol: '$',
    currency_name: 'US Dollar'
  });
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

  useEffect(() => {
    // Only fetch if authenticated (api will handle this implicitly, or we just fail gracefully)
    // Actually, it's better to let components trigger this, or just fetch it once on load.
    const token = localStorage.getItem('token');
    if (token) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [fetchSettings]);

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
