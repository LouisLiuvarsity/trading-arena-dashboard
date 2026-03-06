CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchNumber` int NOT NULL,
	`matchType` varchar(16) NOT NULL DEFAULT 'regular',
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text,
	`competitionId` int,
	`actionUrl` varchar(256),
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`competitionId` int,
	`direction` varchar(8) NOT NULL,
	`size` double NOT NULL,
	`entryPrice` double NOT NULL,
	`openTime` bigint NOT NULL,
	`takeProfit` double,
	`stopLoss` double,
	`tradeNumber` int NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_arenaAccountId_unique` UNIQUE(`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`matchId` int NOT NULL,
	`roundKey` varchar(32) NOT NULL,
	`direction` varchar(8) NOT NULL,
	`confidence` int NOT NULL DEFAULT 3,
	`priceAtPrediction` double NOT NULL,
	`priceAtResolution` double,
	`correct` int,
	`actualPositionDirection` varchar(8),
	`submittedAt` bigint NOT NULL,
	`resolvedAt` bigint,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`achievementKey` varchar(64) NOT NULL,
	`unlockedAt` bigint NOT NULL,
	`competitionId` int,
	`metadata` text,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_ach_unique` UNIQUE(`arenaAccountId`,`achievementKey`)
);
--> statement-breakpoint
CREATE INDEX `idx_notif_account_read` ON `notifications` (`arenaAccountId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_notif_comp` ON `notifications` (`competitionId`);--> statement-breakpoint
CREATE INDEX `idx_positions_comp` ON `positions` (`competitionId`);--> statement-breakpoint
CREATE INDEX `idx_predictions_account_match` ON `predictions` (`arenaAccountId`,`matchId`);--> statement-breakpoint
CREATE INDEX `idx_predictions_round` ON `predictions` (`roundKey`);--> statement-breakpoint
CREATE INDEX `idx_predictions_status` ON `predictions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_ach_account` ON `user_achievements` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_ach_comp` ON `user_achievements` (`competitionId`);