-- English TP descriptions for the English semester report. Additive and nullable:
-- existing rows keep their Indonesian description; reports fall back to it when description_en is empty.
alter table public.learning_objectives add column if not exists description_en text;
comment on column public.learning_objectives.description_en is 'English translation of description for the English semester report; falls back to description when empty.';
