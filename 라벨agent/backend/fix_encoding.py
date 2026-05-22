# -*- coding: utf-8 -*-
import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

conn = pymysql.connect(
    host=os.getenv('DB_HOST'),
    port=int(os.getenv('DB_PORT')),
    user=os.getenv('DB_USER'),
    password=os.getenv('DB_PASSWORD'),
    database=os.getenv('DB_NAME'),
    charset='utf8mb4'
)
cursor = conn.cursor()

cursor.execute("DELETE FROM label_stock")
cursor.execute(
    "INSERT INTO label_stock (material_name, unit, stock_qty) VALUES (%s, %s, %s)",
    ('라벨원단', 'm', 1500)
)
cursor.execute(
    "INSERT INTO label_stock (material_name, unit, stock_qty) VALUES (%s, %s, %s)",
    ('잉크', '통', 12)
)
conn.commit()

cursor.execute("SELECT id, material_name, unit, stock_qty FROM label_stock")
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close()
