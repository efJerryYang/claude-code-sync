CREATE TABLE `conversation_summaries` (
	`leaf_uuid` text PRIMARY KEY NOT NULL,
	`summary` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`leaf_uuid`) REFERENCES `base_messages`(`uuid`) ON UPDATE no action ON DELETE no action
);
