-- Migration: Wallet Integration Support (Apple Wallet & Google Pay)
-- Date: 2025-08-13
-- Description: Add fields to support PassKit wallet integration

-- Add wallet integration fields to customer_loyalty_cards table
ALTER TABLE customer_loyalty_cards 
ADD COLUMN IF NOT EXISTS google_pay_url TEXT,
ADD COLUMN IF NOT EXISTS passkit_id TEXT;

-- Add wallet enablement control to loyalty_cards table
ALTER TABLE loyalty_cards 
ADD COLUMN IF NOT EXISTS wallet_enabled BOOLEAN DEFAULT false;

-- Add index for passkit_id lookups (for efficient updates)
CREATE INDEX IF NOT EXISTS idx_customer_loyalty_cards_passkit_id 
ON customer_loyalty_cards(passkit_id) 
WHERE passkit_id IS NOT NULL;

-- Add index for wallet-enabled loyalty cards
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_wallet_enabled 
ON loyalty_cards(wallet_enabled) 
WHERE wallet_enabled = true;

-- Update existing loyalty cards to enable wallet by default (optional - can be done manually)
-- UPDATE loyalty_cards SET wallet_enabled = true WHERE is_active = true;

COMMENT ON COLUMN customer_loyalty_cards.google_pay_url IS 'Google Pay wallet URL for the loyalty card pass';
COMMENT ON COLUMN customer_loyalty_cards.passkit_id IS 'PassKit pass ID for updating wallet passes';
COMMENT ON COLUMN loyalty_cards.wallet_enabled IS 'Enable Apple Wallet and Google Pay integration for this card';