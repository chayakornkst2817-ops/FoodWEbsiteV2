SELECT current_database(), current_user, version();
SELECT (SELECT count(*) FROM users) AS users,
       (SELECT count(*) FROM orders) AS orders,
       (SELECT count(*) FROM restaurants) AS restaurants,
       (SELECT count(*) FROM uploaded_files) AS files;
SELECT id, restaurant_name, status, total, pickup_date, pickup_time, note
FROM orders ORDER BY (snapshot->>'createdAt')::bigint DESC LIMIT 20;
SELECT id,name,mime_type,octet_length(content) AS bytes,created_at FROM uploaded_files ORDER BY created_at DESC;
