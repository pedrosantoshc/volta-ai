-- Volta.AI Database Schema
-- This file contains the complete database schema for the loyalty platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE campaign_type AS ENUM ('manual', 'ai_generated');
CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed');
CREATE TYPE card_status AS ENUM ('active', 'completed', 'expired');
CREATE TYPE ai_insight_type AS ENUM ('customer_segment', 'campaign_suggestion', 'revenue_opportunity');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE insight_status AS ENUM ('pending', 'acted_on', 'dismissed');

-- Businesses table
CREATE TABLE businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Loyalty cards table
CREATE TABLE loyalty_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    design JSONB NOT NULL DEFAULT '{}',
    rules JSONB NOT NULL DEFAULT '{}',
    enrollment_form JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    custom_fields JSONB DEFAULT '{}',
    enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2),
    last_visit TIMESTAMP WITH TIME ZONE,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    consent JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id, phone)
);

-- Customer loyalty cards table
CREATE TABLE customer_loyalty_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    loyalty_card_id UUID NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
    current_stamps INTEGER DEFAULT 0,
    total_redeemed INTEGER DEFAULT 0,
    wallet_pass_url TEXT,
    qr_code TEXT NOT NULL,
    status card_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(customer_id, loyalty_card_id)
);

-- Campaigns table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type campaign_type NOT NULL DEFAULT 'manual',
    trigger JSONB DEFAULT '{}',
    content JSONB NOT NULL DEFAULT '{}',
    target_audience JSONB DEFAULT '{}',
    schedule JSONB DEFAULT '{}',
    status campaign_status DEFAULT 'draft',
    performance JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Insights table
CREATE TABLE ai_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type ai_insight_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    priority priority_level DEFAULT 'medium',
    status insight_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stamp transactions table (for audit trail)
CREATE TABLE stamp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_loyalty_card_id UUID NOT NULL REFERENCES customer_loyalty_cards(id) ON DELETE CASCADE,
    stamps_added INTEGER NOT NULL DEFAULT 1,
    staff_user_id UUID, -- Reference to auth.users when we implement staff management
    transaction_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'pos', 'qr_scan'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign messages table (for tracking WhatsApp sends)
CREATE TABLE campaign_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    whatsapp_message_id TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'read', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_loyalty_cards_business ON loyalty_cards(business_id);
CREATE INDEX idx_customers_business ON customers(business_id);
CREATE INDEX idx_customers_phone ON customers(business_id, phone);
CREATE INDEX idx_customer_loyalty_cards_customer ON customer_loyalty_cards(customer_id);
CREATE INDEX idx_customer_loyalty_cards_loyalty_card ON customer_loyalty_cards(loyalty_card_id);
CREATE INDEX idx_campaigns_business ON campaigns(business_id);
CREATE INDEX idx_ai_insights_business ON ai_insights(business_id);
CREATE INDEX idx_stamp_transactions_card ON stamp_transactions(customer_loyalty_card_id);
CREATE INDEX idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX idx_campaign_messages_customer ON campaign_messages(customer_id);

-- Row Level Security (RLS) policies
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE stamp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- Business owners can only access their own business data
CREATE POLICY "Business owners can view own business" ON businesses
    FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY "Business owners can manage own loyalty cards" ON loyalty_cards
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Business owners can manage own customers" ON customers
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Business owners can manage customer loyalty cards" ON customer_loyalty_cards
    FOR ALL USING (loyalty_card_id IN (
        SELECT id FROM loyalty_cards WHERE business_id IN (
            SELECT id FROM businesses WHERE auth.uid()::text = id::text
        )
    ));

CREATE POLICY "Business owners can manage campaigns" ON campaigns
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Business owners can view AI insights" ON ai_insights
    FOR ALL USING (business_id IN (
        SELECT id FROM businesses WHERE auth.uid()::text = id::text
    ));

CREATE POLICY "Business owners can view stamp transactions" ON stamp_transactions
    FOR ALL USING (customer_loyalty_card_id IN (
        SELECT clc.id FROM customer_loyalty_cards clc
        JOIN loyalty_cards lc ON clc.loyalty_card_id = lc.id
        WHERE lc.business_id IN (
            SELECT id FROM businesses WHERE auth.uid()::text = id::text
        )
    ));

CREATE POLICY "Business owners can view campaign messages" ON campaign_messages
    FOR ALL USING (campaign_id IN (
        SELECT id FROM campaigns WHERE business_id IN (
            SELECT id FROM businesses WHERE auth.uid()::text = id::text
        )
    ));

-- Functions for business logic
CREATE OR REPLACE FUNCTION check_card_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Get the required stamps for this loyalty card
    DECLARE
        required_stamps INTEGER;
    BEGIN
        SELECT (rules->>'stamps_required')::INTEGER 
        INTO required_stamps 
        FROM loyalty_cards 
        WHERE id = NEW.loyalty_card_id;

        -- If current stamps meet or exceed required stamps, mark as completed
        IF NEW.current_stamps >= required_stamps THEN
            NEW.status = 'completed';
        END IF;

        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically mark cards as completed
CREATE TRIGGER trigger_check_card_completion
    BEFORE UPDATE ON customer_loyalty_cards
    FOR EACH ROW
    EXECUTE FUNCTION check_card_completion();

-- Function to increment total visits when stamps are added
CREATE OR REPLACE FUNCTION increment_customer_visits()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE customers 
    SET total_visits = total_visits + 1,
        last_visit = NOW()
    WHERE id = (
        SELECT customer_id 
        FROM customer_loyalty_cards 
        WHERE id = NEW.customer_loyalty_card_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update customer visit count
CREATE TRIGGER trigger_increment_visits
    AFTER INSERT ON stamp_transactions
    FOR EACH ROW
    EXECUTE FUNCTION increment_customer_visits();

-- Sample data for development (optional)
/*
INSERT INTO businesses (id, name, email, phone, address, settings) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Café Redentor', 'contato@caferedentor.com', '+5531999887766', 'Rua da Bahia, 123 - Centro, Belo Horizonte', 
 '{"ai_tone": "friendly", "brand_voice": "Casual e acolhedor", "auto_campaigns": true, "whatsapp_enabled": true, "apple_wallet_enabled": true, "google_pay_enabled": true}');

INSERT INTO loyalty_cards (business_id, name, description, design, rules, enrollment_form) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Cartão Fidelidade Café', 'Ganhe um café grátis a cada 10 cafés comprados', 
 '{"template_id": "coffee_template", "background_color": "#8B4513", "header_text": "Café Redentor", "footer_text": "Seu café favorito", "stamp_icon": "coffee"}',
 '{"stamps_required": 10, "reward_description": "1 café grátis", "expiry_days": 365}',
 '{"custom_questions": [], "require_email": true, "require_phone": true}');
*/