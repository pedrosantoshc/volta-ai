-- Add public read access for loyalty cards and businesses for enrollment
-- This allows unauthenticated users to access loyalty cards for enrollment

-- Public read access for active loyalty cards (for enrollment)
CREATE POLICY "Public can read active loyalty cards for enrollment" ON loyalty_cards
    FOR SELECT USING (is_active = true);

-- Public read access for businesses (for enrollment page to show business info)
CREATE POLICY "Public can read business info for enrollment" ON businesses
    FOR SELECT USING (true);

-- Allow public insert into customers table (for enrollment)
CREATE POLICY "Public can create customers during enrollment" ON customers
    FOR INSERT WITH CHECK (true);

-- Allow public insert into customer_loyalty_cards table (for enrollment)
CREATE POLICY "Public can create customer loyalty cards during enrollment" ON customer_loyalty_cards
    FOR INSERT WITH CHECK (true);