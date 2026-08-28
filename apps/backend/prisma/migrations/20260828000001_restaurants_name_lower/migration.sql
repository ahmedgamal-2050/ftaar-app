CREATE UNIQUE INDEX IF NOT EXISTS uq_restaurants_name_lower
  ON restaurants (lower(name));
