CREATE TABLE `users` (
	`id` varchar(128) NOT NULL,
	`email` varchar(255) NOT NULL,
	`username` varchar(100) NOT NULL,
	`password` varchar(255) NOT NULL,
	`first_name` varchar(100),
	`last_name` varchar(100),
	`avatar` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`is_verified` boolean NOT NULL DEFAULT false,
	`last_login_at` timestamp,
	`version` int NOT NULL DEFAULT 1,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(128) NOT NULL,
	`name` varchar(50) NOT NULL,
	`display_name` varchar(100) NOT NULL,
	`description` varchar(500),
	`is_active` boolean NOT NULL DEFAULT true,
	`version` int NOT NULL DEFAULT 1,
	`deleted_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(128) NOT NULL,
	`name` varchar(100) NOT NULL,
	`resource` varchar(50) NOT NULL,
	`action` varchar(50) NOT NULL,
	`description` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`),
	CONSTRAINT `permissions_resource_action_idx` UNIQUE(`resource`,`action`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(128) NOT NULL,
	`user_id` varchar(128),
	`action` varchar(100) NOT NULL,
	`resource` varchar(100) NOT NULL,
	`resource_id` varchar(128),
	`details` json,
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(128) NOT NULL,
	`role_id` varchar(128) NOT NULL,
	`permission_id` varchar(128) NOT NULL,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_permission_idx` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(128) NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`token` varchar(500) NOT NULL,
	`refresh_token` varchar(500) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_token_unique` UNIQUE(`token`),
	CONSTRAINT `sessions_refresh_token_unique` UNIQUE(`refresh_token`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(128) NOT NULL,
	`user_id` varchar(128) NOT NULL,
	`role_id` varchar(128) NOT NULL,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_roles_user_role_idx` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_username_idx` ON `users` (`username`);--> statement-breakpoint
CREATE INDEX `users_is_active_idx` ON `users` (`is_active`);--> statement-breakpoint
CREATE INDEX `users_deleted_at_idx` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `roles_deleted_at_idx` ON `roles` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_idx` ON `audit_logs` (`resource`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_user_created_idx` ON `audit_logs` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_action_created_idx` ON `audit_logs` (`resource`,`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `sessions_token_idx` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_refresh_token_idx` ON `sessions` (`refresh_token`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `sessions_user_expires_idx` ON `sessions` (`user_id`,`expires_at`);