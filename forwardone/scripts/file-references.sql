-- Every S3 object the ForwardOne database points at.
-- Run against the Abacus database (psql "$DATABASE_URL" -f scripts/file-references.sql)
-- and compare the count with what scripts/export-abacus-files.mjs downloaded —
-- a referenced key that is missing locally means a document was lost, not migrated.
SELECT 'quote_files' AS source, id, cloud_storage_path, file_name, created_at
FROM quote_files
UNION ALL
SELECT 'shipment_documents', id, cloud_storage_path, file_name, created_at
FROM shipment_documents
UNION ALL
SELECT 'tariff_import_jobs', id, cloud_storage_path, file_name, created_at
FROM tariff_import_jobs
ORDER BY created_at;
