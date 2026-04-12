-- Migration 005: Add approved_style to brand_memory type check constraint
alter table brand_memory drop constraint if exists brand_memory_type_check;

alter table brand_memory add constraint brand_memory_type_check
  check (type in (
    'feedback',
    'learned_rule',
    'style_snapshot',
    'reference_note',
    'anti_pattern',
    'approved_style'
  ));
