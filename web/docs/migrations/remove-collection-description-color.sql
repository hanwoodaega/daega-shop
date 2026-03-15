-- 컬렉션 설명 색상 제거: color_theme JSONB에서 description_color 키 삭제.
-- 설명 텍스트는 항상 검정색으로 통일.

UPDATE collections
SET color_theme = color_theme - 'description_color'
WHERE color_theme IS NOT NULL
  AND color_theme ? 'description_color';
