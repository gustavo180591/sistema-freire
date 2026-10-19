UPDATE "permissions"
SET
    "canCreate" = TRUE,
    "canRead" = TRUE
WHERE
    "roleCode" = 'PRECEPTOR'
    AND "entity" = 'STUDENT';
