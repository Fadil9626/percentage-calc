-- Migration: Add custom label column to ledgers
-- Run this once against the database
ALTER TABLE ledgers ADD COLUMN IF NOT EXISTS label VARCHAR(100);
