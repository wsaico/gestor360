-- Add coordinate columns for "Cabify-style" precise routing
-- limiting to transport_routes for now as requested

ALTER TABLE transport_routes
ADD COLUMN IF NOT EXISTS destination_lat double precision,
ADD COLUMN IF NOT EXISTS destination_lng double precision,
ADD COLUMN IF NOT EXISTS destination_address text,
-- Adding origin as well for future "Point A to Point B" flexibility
ADD COLUMN IF NOT EXISTS origin_lat double precision,
ADD COLUMN IF NOT EXISTS origin_lng double precision,
ADD COLUMN IF NOT EXISTS origin_address text;

-- Comment on columns for clarity
COMMENT ON COLUMN transport_routes.destination_lat IS 'Latitude of the route destination';
COMMENT ON COLUMN transport_routes.destination_lng IS 'Longitude of the route destination';
COMMENT ON COLUMN transport_routes.destination_address IS 'Human-readable address chosen by admin';
