ALTER TABLE slips ADD COLUMN form_meta TEXT NOT NULL DEFAULT '{}';
--> statement-breakpoint
CREATE TABLE slip_template (
  id TEXT PRIMARY KEY CHECK(id='company'),
  xlsx_base64 TEXT NOT NULL,
  wording TEXT NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER people_clear_personal_history
AFTER DELETE ON people
BEGIN
  UPDATE audit_log SET subject_label='Nhân viên đã xóa'
  WHERE space=OLD.space AND action IN ('stock.issue','stock.return')
    AND subject_id IN (SELECT id FROM slips WHERE space=OLD.space AND person_id=OLD.id);

  UPDATE slips SET recipient='Nhân viên đã xóa',person_id='',
    form_meta=json_remove(form_meta,'$.employeeCode')
  WHERE space=OLD.space AND person_id=OLD.id;

  DELETE FROM audit_log WHERE space=OLD.space AND subject_id=OLD.id AND action LIKE 'person.%';

  INSERT INTO audit_log(space,actor,action,subject_id,subject_label)
  SELECT OLD.space,actor,'person.delete','','Hồ sơ nhân viên đã xóa'
  FROM audit_context WHERE space=OLD.space;
END;
