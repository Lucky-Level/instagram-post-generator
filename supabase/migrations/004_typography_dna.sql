-- Migration 004: Add typography_dna column to brand_references
alter table brand_references
  add column if not exists typography_dna jsonb;
