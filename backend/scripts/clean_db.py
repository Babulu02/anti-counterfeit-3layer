"""Drop all tables in both databases — used to reset during development."""
import pymysql

for db in ["anticounterfeit", "anticounterfeit_test"]:
    c = pymysql.connect(
        host="127.0.0.1", port=3306,
        user="ac_user", password="counterfeit_blockchain",
        database=db,
    )
    cur = c.cursor()
    cur.execute("SET FOREIGN_KEY_CHECKS=0")
    cur.execute("SHOW TABLES")
    tables = [r[0] for r in cur.fetchall()]
    for t in tables:
        cur.execute(f"DROP TABLE IF EXISTS `{t}`")
    cur.execute("SET FOREIGN_KEY_CHECKS=1")
    c.commit()
    c.close()
    print(f"{db}: dropped {tables}")
