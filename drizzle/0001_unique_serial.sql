CREATE INDEX IF NOT EXISTS devices_active_serial ON devices(space,serial COLLATE NOCASE)
  WHERE deleted=0 AND serial<>'';
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS devices_unique_serial_insert
BEFORE INSERT ON devices
WHEN NEW.deleted=0 AND NEW.serial<>'' AND EXISTS(
  SELECT 1 FROM devices WHERE space=NEW.space AND deleted=0 AND serial<>'' AND serial=NEW.serial COLLATE NOCASE
)
BEGIN
  SELECT RAISE(ABORT,'duplicate_asset_serial');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS devices_unique_serial_update
BEFORE UPDATE OF serial,deleted ON devices
WHEN NEW.deleted=0 AND NEW.serial<>'' AND (OLD.deleted<>0 OR NEW.serial<>OLD.serial COLLATE NOCASE) AND EXISTS(
  SELECT 1 FROM devices WHERE space=NEW.space AND deleted=0 AND serial<>'' AND serial=NEW.serial COLLATE NOCASE AND id<>NEW.id
)
BEGIN
  SELECT RAISE(ABORT,'duplicate_asset_serial');
END;
