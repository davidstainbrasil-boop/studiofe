-- Avatar Models Seed (with required columns)
INSERT INTO avatar_models (name, display_name, description, avatar_type, gender, is_active, is_premium, model_file_url, thumbnail_url) VALUES
('Josh Lite', 'Josh - Casual Style', 'HeyGen casual presenter', 'realistic', 'male', true, false, 'https://heygen.com/avatars/josh.glb', 'https://heygen.com/avatars/josh.jpg'),
('Monica Professional', 'Monica - Professional', 'HeyGen professional presenter', 'professional', 'female', true, false, 'https://heygen.com/avatars/monica.glb', 'https://heygen.com/avatars/monica.jpg'),
('Emily D-ID', 'Emily - AI Presenter', 'D-ID AI presenter', 'realistic', 'female', true, true, 'https://d-id.com/avatars/emily.glb', 'https://d-id.com/avatars/emily.jpg'),
('Alex D-ID', 'Alex - Tech Presenter', 'D-ID tech presenter', 'professional', 'male', true, true, 'https://d-id.com/avatars/alex.glb', 'https://d-id.com/avatars/alex.jpg'),
('UE5 Male 01', 'Realistic Male Avatar', 'Unreal Engine 5 realistic male', 'realistic', 'male', true, true, '/assets/avatars/ue5_male_01.glb', '/assets/avatars/ue5_male_01.jpg'),
('UE5 Female 01', 'Realistic Female Avatar', 'Unreal Engine 5 realistic female', 'realistic', 'female', true, true, '/assets/avatars/ue5_female_01.glb', '/assets/avatars/ue5_female_01.jpg'),
('Default Avatar', 'Standard Presenter', 'Default system presenter', 'stylized', 'neutral', true, false, '/assets/avatars/default.glb', '/assets/avatars/default.jpg'),
('Business Avatar', 'Corporate Presenter', 'Business meeting presenter', 'professional', 'neutral', true, false, '/assets/avatars/business.glb', '/assets/avatars/business.jpg')
ON CONFLICT DO NOTHING;
