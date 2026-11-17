-- Sinkron nilai ke Google Legger dihentikan: Legger dibaca langsung dari database CQlass.
alter table public.academic_scores disable trigger trg_academic_scores_legger_outbox;
-- Antrean yang belum terkirim tidak diproses lagi (nilai asli tetap aman di academic_scores).
delete from public.legger_sync_outbox where status <> 'synced';
