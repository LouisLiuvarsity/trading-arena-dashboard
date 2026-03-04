CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminUserId` int NOT NULL,
	`adminName` varchar(128) NOT NULL,
	`action` varchar(64) NOT NULL,
	`targetType` varchar(32) NOT NULL,
	`targetId` varchar(64) NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`ipAddress` varchar(45),
	`createdAt` bigint NOT NULL,
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `arena_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`inviteCode` varchar(32) NOT NULL,
	`passwordHash` varchar(256),
	`inviteConsumed` int NOT NULL DEFAULT 0,
	`role` varchar(16) NOT NULL DEFAULT 'user',
	`capital` double NOT NULL DEFAULT 5000,
	`seasonPoints` double NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `arena_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `arena_accounts_username_unique` UNIQUE(`username`),
	CONSTRAINT `arena_accounts_inviteCode_unique` UNIQUE(`inviteCode`)
);
--> statement-breakpoint
CREATE TABLE `arena_sessions` (
	`token` varchar(128) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`createdAt` bigint NOT NULL,
	`lastSeen` bigint NOT NULL,
	`expiresAt` bigint NOT NULL,
	CONSTRAINT `arena_sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `behavior_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int,
	`eventType` varchar(64) NOT NULL,
	`payload` text,
	`source` varchar(32),
	`timestamp` bigint NOT NULL,
	CONSTRAINT `behavior_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` varchar(64) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`competitionId` int,
	`username` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(16) NOT NULL DEFAULT 'user',
	`timestamp` bigint NOT NULL,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_moderation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chatMessageId` varchar(64) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'visible',
	`moderatedBy` int,
	`moderatedByName` varchar(128),
	`moderatedAt` bigint,
	`reason` text,
	CONSTRAINT `chat_moderation_id` PRIMARY KEY(`id`),
	CONSTRAINT `chat_moderation_chatMessageId_unique` UNIQUE(`chatMessageId`)
);
--> statement-breakpoint
CREATE TABLE `competition_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`arenaAccountId` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`appliedAt` bigint NOT NULL,
	`reviewedAt` bigint,
	`reviewedBy` int,
	`adminNote` text,
	`priority` int NOT NULL DEFAULT 0,
	CONSTRAINT `competition_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_reg_unique` UNIQUE(`competitionId`,`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`competitionNumber` int NOT NULL,
	`competitionType` varchar(16) NOT NULL DEFAULT 'regular',
	`status` varchar(24) NOT NULL DEFAULT 'draft',
	`matchId` int,
	`maxParticipants` int NOT NULL DEFAULT 50,
	`minParticipants` int NOT NULL DEFAULT 5,
	`registrationOpenAt` bigint,
	`registrationCloseAt` bigint,
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`symbol` varchar(16) NOT NULL DEFAULT 'SOLUSDT',
	`startingCapital` double NOT NULL DEFAULT 5000,
	`maxTradesPerMatch` int NOT NULL DEFAULT 40,
	`closeOnlySeconds` int NOT NULL DEFAULT 1800,
	`feeRate` double NOT NULL DEFAULT 0.0005,
	`prizePool` double NOT NULL DEFAULT 500,
	`prizeTableJson` text,
	`pointsTableJson` text,
	`requireMinSeasonPoints` int NOT NULL DEFAULT 0,
	`requireMinTier` varchar(16),
	`inviteOnly` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`nameEn` varchar(256),
	`shortName` varchar(64),
	`type` varchar(32) NOT NULL DEFAULT 'university',
	`country` varchar(2) NOT NULL,
	`region` varchar(64),
	`city` varchar(64),
	`logoUrl` varchar(512),
	`verified` int NOT NULL DEFAULT 0,
	`memberCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`arenaAccountId` int NOT NULL,
	`finalRank` int NOT NULL,
	`totalPnl` double NOT NULL DEFAULT 0,
	`totalPnlPct` double NOT NULL DEFAULT 0,
	`totalWeightedPnl` double NOT NULL DEFAULT 0,
	`tradesCount` int NOT NULL DEFAULT 0,
	`winCount` int NOT NULL DEFAULT 0,
	`lossCount` int NOT NULL DEFAULT 0,
	`bestTradePnl` double,
	`worstTradePnl` double,
	`avgHoldDuration` double,
	`avgHoldWeight` double,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`prizeWon` double NOT NULL DEFAULT 0,
	`prizeEligible` int NOT NULL DEFAULT 0,
	`rankTierAtTime` varchar(16),
	`finalEquity` double NOT NULL DEFAULT 5000,
	`closeReasonStats` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `match_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_mr_unique` UNIQUE(`competitionId`,`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`pointsDecayFactor` double NOT NULL DEFAULT 0.8,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` varchar(64) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`matchId` int NOT NULL,
	`direction` varchar(8) NOT NULL,
	`size` double NOT NULL,
	`entryPrice` double NOT NULL,
	`exitPrice` double NOT NULL,
	`pnl` double NOT NULL,
	`pnlPct` double NOT NULL,
	`fee` double NOT NULL DEFAULT 0,
	`weightedPnl` double NOT NULL,
	`holdDuration` double NOT NULL,
	`holdWeight` double NOT NULL,
	`closeReason` varchar(16) NOT NULL,
	`openTime` bigint NOT NULL,
	`closeTime` bigint NOT NULL,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`arenaAccountId` int NOT NULL,
	`displayName` varchar(64),
	`avatarUrl` varchar(512),
	`bio` varchar(280),
	`country` varchar(2),
	`region` varchar(64),
	`city` varchar(64),
	`institutionId` int,
	`institutionName` varchar(128),
	`department` varchar(128),
	`graduationYear` int,
	`participantType` varchar(16) NOT NULL DEFAULT 'independent',
	`socialLinks` text,
	`isProfilePublic` int NOT NULL DEFAULT 1,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `user_profiles_arenaAccountId` PRIMARY KEY(`arenaAccountId`)
);
--> statement-breakpoint
CREATE INDEX `idx_admin_logs_admin` ON `admin_logs` (`adminUserId`);--> statement-breakpoint
CREATE INDEX `idx_admin_logs_action` ON `admin_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_admin_logs_target` ON `admin_logs` (`targetType`,`targetId`);--> statement-breakpoint
CREATE INDEX `idx_admin_logs_time` ON `admin_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `arena_sessions` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_behavior_account` ON `behavior_events` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_behavior_timestamp` ON `behavior_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_chat_timestamp` ON `chat_messages` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_chat_mod_status` ON `chat_moderation` (`status`);--> statement-breakpoint
CREATE INDEX `idx_reg_comp_status` ON `competition_registrations` (`competitionId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reg_account` ON `competition_registrations` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_comp_season` ON `competitions` (`seasonId`);--> statement-breakpoint
CREATE INDEX `idx_comp_status` ON `competitions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_comp_start` ON `competitions` (`startTime`);--> statement-breakpoint
CREATE INDEX `idx_inst_country` ON `institutions` (`country`);--> statement-breakpoint
CREATE INDEX `idx_inst_type` ON `institutions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_mr_account` ON `match_results` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_mr_rank` ON `match_results` (`competitionId`,`finalRank`);--> statement-breakpoint
CREATE INDEX `idx_trades_account_match` ON `trades` (`arenaAccountId`,`matchId`);--> statement-breakpoint
CREATE INDEX `idx_trades_close_time` ON `trades` (`closeTime`);--> statement-breakpoint
CREATE INDEX `idx_profile_country` ON `user_profiles` (`country`);--> statement-breakpoint
CREATE INDEX `idx_profile_institution` ON `user_profiles` (`institutionId`);