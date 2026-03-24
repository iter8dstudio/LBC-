-- Add biweekly plan option for boost plans
ALTER TYPE "BoostPlan" ADD VALUE IF NOT EXISTS 'biweekly';
