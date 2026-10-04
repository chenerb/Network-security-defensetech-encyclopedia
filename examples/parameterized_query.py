"""Literal query values and allowlisted identifiers in an in-memory database."""
import sqlite3


def demo_database():
    connection = sqlite3.connect(":memory:")
    connection.execute("CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL)")
    connection.executemany("INSERT INTO customers (id, name) VALUES (?, ?)",
                           [(1, "Alice"), (2, "O'Reilly")])
    return connection


def find_customer(connection, name):
    # Values remain data. Never interpolate `name` into the SQL statement.
    return connection.execute("SELECT id, name FROM customers WHERE name = ?", (name,)).fetchall()


def list_customers(connection, sort_by):
    # Placeholders cannot stand for column names. Only trusted literals may.
    columns = {"id": "id", "name": "name"}
    if sort_by not in columns:
        raise ValueError("sort_by must be id or name")
    statement = "SELECT id, name FROM customers ORDER BY " + columns[sort_by]
    return connection.execute(statement).fetchall()


def main():
    connection = demo_database()
    try:
        print("带引号的姓名：", find_customer(connection, "O'Reilly"))
        print("未知姓名：", find_customer(connection, "unknown' name"))
        print("按允许的列排序：", list_customers(connection, "name"))
    finally:
        connection.close()


if __name__ == "__main__":
    main()
