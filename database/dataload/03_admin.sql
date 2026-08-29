INSERT INTO admin (id_admin, email, senha_hash) VALUES
    (1, 'admin@astro.local', '$2b$12$01234567890123456789012345678901234567890123456789012')
ON CONFLICT DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('admin', 'id_admin'),
    COALESCE(MAX(id_admin), 1),
    TRUE
)
FROM admin;