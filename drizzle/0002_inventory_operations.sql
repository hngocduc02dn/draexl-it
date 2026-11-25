CREATE TABLE IF NOT EXISTS departments (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  name_key TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  rev INTEGER NOT NULL DEFAULT 1,
  updated TEXT NOT NULL,
  PRIMARY KEY (space,id),
  UNIQUE (space,name_key)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS people_by_department ON people(space,department);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS devices_by_department ON devices(space,department,deleted);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS inventory_counts (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  scope TEXT NOT NULL,
  scope_label TEXT NOT NULL,
  note TEXT NOT NULL,
  actor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
  total INTEGER NOT NULL,
  checked INTEGER NOT NULL DEFAULT 0,
  discrepancies INTEGER NOT NULL DEFAULT 0,
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  write_id TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(space,id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS counts_by_date ON inventory_counts(space,created DESC,id DESC);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS inventory_count_items (
  space TEXT NOT NULL,
  count_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial TEXT NOT NULL,
  asset_status TEXT NOT NULL,
  department TEXT NOT NULL,
  location TEXT NOT NULL,
  holder TEXT NOT NULL,
  mark TEXT NOT NULL DEFAULT '' CHECK(mark IN ('','found','missing','review')),
  note TEXT NOT NULL DEFAULT '',
  PRIMARY KEY(space,count_id,asset_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_context (
  space TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  mode TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS audit_log (
  space TEXT NOT NULL,
  id TEXT NOT NULL DEFAULT (lower(hex(randomblob(16)))),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  subject_label TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(space,id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_by_date ON audit_log(space,created DESC,id DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS audit_by_action ON audit_log(space,action,created DESC,id DESC);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS departments_in_use
BEFORE DELETE ON departments
WHEN EXISTS(SELECT 1 FROM people WHERE space=OLD.space AND department=OLD.name COLLATE BINARY)
  OR EXISTS(SELECT 1 FROM devices WHERE space=OLD.space AND department=OLD.name COLLATE BINARY AND deleted=0)
BEGIN
  SELECT RAISE(ABORT,'department_in_use');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS departments_rename_links
AFTER UPDATE OF name ON departments
WHEN NEW.name<>OLD.name COLLATE BINARY
BEGIN
  UPDATE people SET department=NEW.name,rev=rev+1
  WHERE space=NEW.space AND department=OLD.name COLLATE BINARY;
  UPDATE devices SET department=NEW.name,rev=rev+1,updated=NEW.updated
  WHERE space=NEW.space AND department=OLD.name COLLATE BINARY AND deleted=0;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS people_check_department_insert
BEFORE INSERT ON people
WHEN NEW.department<>'' AND EXISTS(SELECT 1 FROM spaces_seeded WHERE space='departments:'||NEW.space)
  AND NOT EXISTS(SELECT 1 FROM departments WHERE space=NEW.space AND name=NEW.department COLLATE BINARY)
BEGIN
  SELECT RAISE(ABORT,'department_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS people_check_department_update
BEFORE UPDATE OF department ON people
WHEN NEW.department<>'' AND NEW.department<>OLD.department
  AND EXISTS(SELECT 1 FROM spaces_seeded WHERE space='departments:'||NEW.space)
  AND NOT EXISTS(SELECT 1 FROM departments WHERE space=NEW.space AND name=NEW.department COLLATE BINARY)
BEGIN
  SELECT RAISE(ABORT,'department_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS devices_check_department_insert
BEFORE INSERT ON devices
WHEN NEW.department<>'' AND EXISTS(SELECT 1 FROM spaces_seeded WHERE space='departments:'||NEW.space)
  AND NOT EXISTS(SELECT 1 FROM departments WHERE space=NEW.space AND name=NEW.department COLLATE BINARY)
BEGIN
  SELECT RAISE(ABORT,'department_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS devices_check_department_update
BEFORE UPDATE OF department ON devices
WHEN NEW.department<>'' AND NEW.department<>OLD.department
  AND EXISTS(SELECT 1 FROM spaces_seeded WHERE space='departments:'||NEW.space)
  AND NOT EXISTS(SELECT 1 FROM departments WHERE space=NEW.space AND name=NEW.department COLLATE BINARY)
BEGIN
  SELECT RAISE(ABORT,'department_unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_department_create
AFTER INSERT ON departments
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,'department.create',NEW.id,NEW.name,json_object('description',NEW.description)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_department_update
AFTER UPDATE ON departments
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,'department.update',NEW.id,NEW.name,json_object('oldName',OLD.name,'description',NEW.description)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_department_delete
AFTER DELETE ON departments
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label)
  SELECT OLD.space,actor,'department.delete',OLD.id,OLD.name
  FROM audit_context WHERE space=OLD.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_person_create
AFTER INSERT ON people
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,'person.create',NEW.id,NEW.name,json_object('department',NEW.department)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_person_update
AFTER UPDATE ON people
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN OLD.active=1 AND NEW.active=0 THEN 'person.offboard' ELSE 'person.update' END,
    NEW.id,NEW.name,json_object('oldName',OLD.name,'oldDepartment',OLD.department,'department',NEW.department)
  FROM audit_context WHERE space=NEW.space AND mode<>'department';
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_device_create
AFTER INSERT ON devices
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN NEW.status IN ('ready','stored','damaged') THEN 'stock.receive' ELSE 'device.create' END,
    NEW.id,NEW.name,json_object('code',NEW.code,'serial',NEW.serial,'type',NEW.type,'status',NEW.status,
      'department',NEW.department,'location',NEW.location,'note',NEW.note)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_device_update
AFTER UPDATE ON devices
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN NEW.deleted=1 THEN 'device.delete' ELSE 'device.update' END,
    NEW.id,NEW.name,json_object('code',NEW.code,'oldCode',OLD.code,'status',NEW.status,'oldStatus',OLD.status,
      'department',NEW.department,'oldDepartment',OLD.department)
  FROM audit_context WHERE space=NEW.space AND mode='device';
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_slip_create
AFTER INSERT ON slips
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN NEW.kind='issue' THEN 'stock.issue' ELSE 'stock.return' END,
    NEW.id,NEW.recipient,json_object('count',json_array_length(NEW.items),'department',NEW.department,
      'eventDate',NEW.event_date,'offboard',NEW.offboard)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_inventory_create
AFTER INSERT ON inventory_counts
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,'count.create',NEW.id,NEW.title,json_object('total',NEW.total,'scope',NEW.scope_label)
  FROM audit_context WHERE space=NEW.space;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS audit_inventory_update
AFTER UPDATE ON inventory_counts
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN NEW.status='closed' THEN 'count.close' ELSE 'count.update' END,
    NEW.id,NEW.title,json_object('total',NEW.total,'checked',NEW.checked,'discrepancies',NEW.discrepancies)
  FROM audit_context WHERE space=NEW.space;
END;
