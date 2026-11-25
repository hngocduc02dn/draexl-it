CREATE TABLE accounts (
  username TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('it','viewer')),
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  expires INTEGER NOT NULL
);
--> statement-breakpoint
CREATE INDEX sessions_username ON sessions(username);
--> statement-breakpoint
CREATE TABLE login_limits (
  bucket TEXT PRIMARY KEY,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE spaces_seeded (space TEXT PRIMARY KEY);
--> statement-breakpoint
CREATE TABLE people (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  dob TEXT NOT NULL DEFAULT '',
  position TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  rev INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (space, id)
);
--> statement-breakpoint
CREATE TABLE devices (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  code TEXT NOT NULL COLLATE NOCASE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('assigned','stored','ready','damaged','destroyed')),
  department TEXT NOT NULL DEFAULT '',
  person_id TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  updated TEXT NOT NULL,
  rev INTEGER NOT NULL DEFAULT 1,
  deleted INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (space, id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX devices_active_code ON devices(space,code) WHERE deleted=0;
--> statement-breakpoint
CREATE INDEX devices_person ON devices(space,person_id,deleted,status);
--> statement-breakpoint
CREATE TABLE slips (
  space TEXT NOT NULL,
  id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('issue','return')),
  recipient TEXT NOT NULL,
  department TEXT NOT NULL,
  person_id TEXT NOT NULL,
  event_date TEXT NOT NULL,
  creator TEXT NOT NULL,
  note TEXT NOT NULL,
  items TEXT NOT NULL,
  offboard INTEGER NOT NULL,
  created TEXT NOT NULL,
  PRIMARY KEY (space,id)
);
--> statement-breakpoint
CREATE INDEX slips_created ON slips(space,created DESC);
