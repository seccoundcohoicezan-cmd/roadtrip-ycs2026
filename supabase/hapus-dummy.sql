-- Hapus SEMUA data dummy (kata asli peserta tidak tersentuh).
delete from public.words where is_dummy = true;

select count(*) as sisa_kata_asli from public.words;
