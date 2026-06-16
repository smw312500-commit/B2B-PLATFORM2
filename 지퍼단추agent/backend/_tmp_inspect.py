import os
import pymysql

for line in open(".env", encoding="utf-8"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())

conn = pymysql.connect(
    host=os.getenv("DB_HOST", "127.0.0.1"),
    port=int(os.getenv("DB_PORT", "3306")),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", ""),
    database=os.getenv("DB_NAME", "company_zipper"),
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,
)

with conn:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, item_name, release_qty, due_date, label_code, status, release_date, started_at, finished_at "
            "FROM zipper_release WHERE due_date = '2026-06-14' ORDER BY item_name, id"
        )
        for row in cur.fetchall():
            print(row)
        print("---stock---")
        cur.execute("SELECT * FROM zipper_stock")
        for row in cur.fetchall():
            print(row)
        print("---existing platform report events---")
        cur.execute("SELECT id, report_type, item_ref, status, report_id FROM zipper_platform_report_event ORDER BY id")
        for row in cur.fetchall():
            print(row)
