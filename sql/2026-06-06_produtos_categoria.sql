-- Fase catálogo — adiciona categoria aos produtos
alter table rp_products add column if not exists categoria text;
create index if not exists idx_products_categoria on rp_products(categoria);
notify pgrst, 'reload schema';
