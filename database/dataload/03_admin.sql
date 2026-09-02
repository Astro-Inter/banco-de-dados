INSERT INTO admin (nome, email, firebase_uid)
VALUES (
    'Astro',
    'app.4str0@gmail.com',
    'cvZAMfXsrzNooRHSGCwAmRJ3bx63'
)
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    firebase_uid = EXCLUDED.firebase_uid;
