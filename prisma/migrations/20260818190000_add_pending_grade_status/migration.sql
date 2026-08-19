-- Estado transitorio para permitir borradores y distinguir una nota aún no cargada.
ALTER TYPE "GradeStatus" ADD VALUE IF NOT EXISTS 'PENDING';
