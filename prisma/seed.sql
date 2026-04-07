INSERT INTO employees (id, name, registration, password, shift, active, "createdAt", "updatedAt")
VALUES 
('lucas-carvalho', 'Lucas Carvalho', '116221', 'Mudar@116221', 2, true, NOW(), NOW()),
('jose-augusto', 'JOSE AUGUSTO', '499277', 'Mudar@499277', 2, true, NOW(), NOW()),
('janaina-mendes', 'Janaina Mendes', '116265', 'Mudar@116265', 2, true, NOW(), NOW()),
('anna', 'Anna', '116203', 'Mudar@116203', 1, true, NOW(), NOW()),
('fabiano', 'Fabiano', '116248', '116248', 1, true, NOW(), NOW())
ON CONFLICT (registration) DO UPDATE SET 
name = EXCLUDED.name,
password = EXCLUDED.password,
shift = EXCLUDED.shift,
active = EXCLUDED.active,
"updatedAt" = NOW();
