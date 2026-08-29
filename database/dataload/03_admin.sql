INSERT INTO admin (email, senha_hash)
VALUES (
    'admin@astro.local',
    '$2b$12$01234567890123456789012345678901234567890123456789012'
)
ON CONFLICT (email) DO UPDATE
SET senha_hash = EXCLUDED.senha_hash;