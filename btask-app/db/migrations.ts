const migrations = {
  journal: {
    entries: [
      {
        idx: 0,
        when: 1772150145793,
        tag: "0000_glossy_random",
        breakpoints: true,
      },
      {
        idx: 1,
        when: 1772152113096,
        tag: "0001_last_mystique",
        breakpoints: true,
      },
    ],
  },
  migrations: {
    m0000: `CREATE TABLE \`blocks\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`name\` text NOT NULL,
	\`icon\` text DEFAULT '📋' NOT NULL,
	\`type\` text DEFAULT 'simple' NOT NULL,
	\`weight\` text DEFAULT 'medium' NOT NULL
);`,
    m0001: `CREATE TABLE \`reminders\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`text\` text NOT NULL,
	\`is_completed\` integer DEFAULT false NOT NULL,
	\`weight\` text DEFAULT 'medium' NOT NULL,
	\`date\` text NOT NULL,
	\`created_at\` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE \`tasks\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`block_id\` integer NOT NULL,
	\`title\` text NOT NULL,
	\`is_completed\` integer DEFAULT false NOT NULL,
	\`kanban_column\` text DEFAULT 'todo' NOT NULL,
	\`created_at\` text NOT NULL,
	FOREIGN KEY (\`block_id\`) REFERENCES \`blocks\`(\`id\`) ON UPDATE no action ON DELETE no action
);`,
  },
};

export default migrations;
