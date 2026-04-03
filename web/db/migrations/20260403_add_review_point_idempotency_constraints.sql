-- Enforce idempotency for review creation and review point accrual.
-- 1) One review per (user, order, product)
-- 2) One review point history row per review_id

-- Remove duplicate reviews while keeping the oldest record.
WITH ranked_reviews AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, order_id, product_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM reviews
)
DELETE FROM reviews
WHERE ctid IN (
  SELECT ctid FROM ranked_reviews WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user_order_product_unique
ON reviews (user_id, order_id, product_id);

-- Remove duplicate review point entries while keeping the oldest record.
WITH ranked_review_points AS (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, review_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM point_history
  WHERE type = 'review'
    AND review_id IS NOT NULL
)
DELETE FROM point_history
WHERE ctid IN (
  SELECT ctid FROM ranked_review_points WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_history_review_once
ON point_history (user_id, review_id)
WHERE type = 'review' AND review_id IS NOT NULL;
