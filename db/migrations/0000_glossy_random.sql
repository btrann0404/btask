CREATE TABLE `blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '📋' NOT NULL,
	`type` text DEFAULT 'simple' NOT NULL,
	`weight` text DEFAULT 'medium' NOT NULL
);
