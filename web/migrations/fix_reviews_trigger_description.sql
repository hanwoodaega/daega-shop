-- reviews 테이블의 트리거에서 NEW.description 참조 오류 수정
-- 트리거가 point_history에 데이터를 삽입할 때 description 필드를 참조하지 않도록 수정

-- 먼저 기존 트리거를 찾아서 삭제
DO $$
DECLARE
    trg_name TEXT;
BEGIN
    -- reviews 테이블에 연결된 모든 트리거 찾기
    FOR trg_name IN 
        SELECT t.trigger_name 
        FROM information_schema.triggers t
        WHERE t.event_object_table = 'reviews'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON reviews CASCADE', trg_name);
        RAISE NOTICE 'Dropped trigger: %', trg_name;
    END LOOP;
END $$;

-- 트리거가 자동으로 포인트를 적립하는 것을 방지
-- 포인트 적립은 API 레벨에서 처리하므로 트리거는 필요 없습니다.

