ALTER TABLE people ADD COLUMN employee_code TEXT NOT NULL DEFAULT '' COLLATE NOCASE;
--> statement-breakpoint
UPDATE people SET employee_code='NV-' || upper(hex(randomblob(6))) WHERE employee_code='';
--> statement-breakpoint
CREATE UNIQUE INDEX people_employee_code ON people(space,employee_code) WHERE employee_code<>'';
--> statement-breakpoint
CREATE TRIGGER people_assign_employee_code
AFTER INSERT ON people
WHEN NEW.employee_code=''
BEGIN
  UPDATE people SET employee_code='NV-' || upper(hex(randomblob(6)))
  WHERE space=NEW.space AND id=NEW.id;
END;
--> statement-breakpoint
DROP TRIGGER audit_person_update;
--> statement-breakpoint
CREATE TRIGGER audit_person_update
AFTER UPDATE OF rev ON people
BEGIN
  INSERT INTO audit_log(space,actor,action,subject_id,subject_label,details)
  SELECT NEW.space,actor,CASE WHEN OLD.active=1 AND NEW.active=0 THEN 'person.offboard' ELSE 'person.update' END,
    NEW.id,NEW.name,json_object('oldName',OLD.name,'oldDepartment',OLD.department,'department',NEW.department)
  FROM audit_context WHERE space=NEW.space AND mode<>'department';
END;
