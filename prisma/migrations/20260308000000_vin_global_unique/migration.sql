-- Migration: vin_global_unique
-- Remove o índice composto (vin, shiftDate) e cria índice único apenas em (vin)
-- Um VIN de carro é globalmente único e nunca pode ser registrado duas vezes.

-- Remove registros duplicados de VIN (mantém o mais antigo)
DELETE FROM productions
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY vin ORDER BY "createdAt" ASC) AS rn
    FROM productions
  ) ranked
  WHERE rn > 1
);

-- Remove a constraint antiga (vin + shiftDate)
ALTER TABLE productions
  DROP CONSTRAINT IF EXISTS "productions_vin_shiftDate_key";

-- Cria a nova constraint única apenas no vin
ALTER TABLE productions
  ADD CONSTRAINT "productions_vin_key" UNIQUE (vin);
