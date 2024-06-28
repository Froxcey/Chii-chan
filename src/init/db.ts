import { Database } from "bun:sqlite";

export default function db() {
  const db = new Database("data.db", { create: true, readwrite: true });
  db.run(
    "CREATE TABLE IF NOT EXISTS list (id INTEGER, role TEXT, nextEp INTEGER, nextTime INTEGER, title TEXT);",
  );
  db.run("CREATE TABLE IF NOT EXISTS archive (id INTEGER, role TEXT);");

  return {
    db: db,
    queries: {
      listFind: db.query("SELECT * FROM list WHERE id = $1;"),
      listFindRole: db.query("SELECT * FROM list WHERE role = $1;"),
      listInsert: db.query(
        "INSERT INTO list (id, role, nextEp, nextTime, title) VALUES (?1, ?2, ?3, ?4, ?5);",
      ),
      listAll: db.query("SELECT * FROM list;"),
      listUpdate: db.query(
        "UPDATE list SET nextEp = $2, nextTime = $3, title = $4 WHERE id = $1;",
      ),
      listDelRole: db.query("DELETE FROM list WHERE role = ?1;"),
      toArchive: db.query(`
        BEGIN TRANSACTION;
        INSERT INTO archive (id, role) SELECT id, role FROM list WHERE id = $1;
        DELETE FROM list WHERE id = ?1;
        COMMIT;
      `),
      archiveFind: db.query("SELECT * FROM archive WHERE id = $1;"),
      archiveFindRole: db.query("SELECT * FROM archive WHERE role = $1;"),
      archiveInsert: db.query(
        "INSERT INTO archive (id, role) VALUES (?1, ?2);",
      ),
      archiveDelRole: db.query("DELETE FROM archive WHERE role = ?1;"),
    },
  };
}
