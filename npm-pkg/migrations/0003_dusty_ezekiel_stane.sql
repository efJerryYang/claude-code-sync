-- Add original_cwd column to base_messages
ALTER TABLE `base_messages` ADD `original_cwd` text NOT NULL DEFAULT '';
--> statement-breakpoint
-- Initialize original_cwd with cwd values for existing rows
UPDATE `base_messages` SET `original_cwd` = `cwd`;