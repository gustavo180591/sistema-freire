-- Update location names from Posadas/Oberá to Leandro N. Alem/Capiovi
UPDATE "locations" 
SET 
    "name" = 'Leandro N. Alem',
    "code" = 'ALEM',
    "city" = 'Leandro N. Alem'
WHERE "code" = 'POSADAS';

UPDATE "locations" 
SET 
    "name" = 'Capiovi',
    "code" = 'CAPIOVI',
    "city" = 'Capiovi'
WHERE "code" = 'OBERA';

-- Update the default location ID reference if it exists
UPDATE "careers" 
SET "locationId" = (
    SELECT "id" FROM "locations" WHERE "code" = 'ALEM' LIMIT 1
)
WHERE "locationId" = 'default-location-id';

-- Update academic terms location reference if it was using POSADAS
UPDATE "academic_terms" 
SET "locationId" = (
    SELECT "id" FROM "locations" WHERE "code" = 'ALEM' LIMIT 1
)
WHERE "locationId" = (
    SELECT "id" FROM "locations" WHERE "code" = 'POSADAS' LIMIT 1
);
