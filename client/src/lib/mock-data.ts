/**
 * Mock data mirroring the Trading Arena database schema
 * Covers: users, profiles, competitions, registrations, chat messages, match results
 */

// ─── Types ─────────────────────────────────────────────────
export type RankTier = "iron" | "bronze" | "silver" | "gold" | "platinum" | "diamond";
export type RegistrationStatus = "pending" | "accepted" | "rejected" | "waitlisted" | "withdrawn";
export type CompetitionStatus = "draft" | "announced" | "registration_open" | "registration_closed" | "live" | "settling" | "completed" | "cancelled";
export type CompetitionType = "regular" | "grand_final" | "special" | "practice";
export type ChatMessageStatus = "visible" | "hidden" | "deleted";

export interface User {
  id: number;
  username: string;
  displayName: string | null;
  email: string;
  ip: string;
  lastLoginIp: string;
  country: string;
  region: string | null;
  city: string | null;
  institutionName: string | null;
  department: string | null;
  graduationYear: number | null;
  participantType: "student" | "professional" | "independent";
  bio: string | null;
  rankTier: RankTier;
  seasonPoints: number;
  capital: number;
  matchesPlayed: number;
  totalPnl: number;
  totalPrize: number;
  winRate: number;
  bestRank: number;
  isProfilePublic: boolean;
  isBanned: boolean;
  createdAt: number;
  lastLoginAt: number;
  registrationSource: string;
}

export interface Competition {
  id: number;
  slug: string;
  title: string;
  competitionNumber: number;
  competitionType: CompetitionType;
  status: CompetitionStatus;
  seasonId: number;
  maxParticipants: number;
  registeredCount: number;
  acceptedCount: number;
  prizePool: number;
  symbol: string;
  startTime: number;
  endTime: number;
  registrationOpenAt: number | null;
  registrationCloseAt: number | null;
  startingCapital: number;
  description: string | null;
}

export interface Registration {
  id: number;
  competitionId: number;
  competitionTitle: string;
  arenaAccountId: number;
  username: string;
  status: RegistrationStatus;
  seasonPoints: number;
  rankTier: RankTier;
  matchesPlayed: number;
  institutionName: string | null;
  country: string | null;
  appliedAt: number;
  reviewedAt: number | null;
}

export interface ChatMessage {
  id: number;
  competitionId: number;
  competitionTitle: string;
  userId: number;
  username: string;
  rankTier: RankTier;
  message: string;
  status: ChatMessageStatus;
  createdAt: number;
  moderatedAt: number | null;
  moderatedBy: string | null;
}

export interface MatchResult {
  id: number;
  competitionId: number;
  competitionTitle: string;
  arenaAccountId: number;
  username: string;
  finalRank: number;
  totalPnl: number;
  totalPnlPct: number;
  tradesCount: number;
  winCount: number;
  lossCount: number;
  pointsEarned: number;
  prizeWon: number;
  prizeEligible: boolean;
  participantCount: number;
  createdAt: number;
}

// ─── Helpers ───────────────────────────────────────────────
const now = Date.now();
const day = 86400000;
const hour = 3600000;

const countries = ["CN", "US", "JP", "KR", "SG", "GB", "DE", "AU", "CA", "HK", "TW", "IN", "FR", "BR", "RU"];
const cities: Record<string, string[]> = {
  CN: ["北京", "上海", "深圳", "杭州", "广州", "成都", "南京", "武汉"],
  US: ["New York", "San Francisco", "Chicago", "Los Angeles", "Boston"],
  JP: ["Tokyo", "Osaka", "Yokohama"],
  KR: ["Seoul", "Busan"],
  SG: ["Singapore"],
  GB: ["London", "Manchester"],
  DE: ["Berlin", "Frankfurt"],
  AU: ["Sydney", "Melbourne"],
  CA: ["Toronto", "Vancouver"],
  HK: ["Hong Kong"],
  TW: ["Taipei"],
  IN: ["Mumbai", "Bangalore"],
  FR: ["Paris"],
  BR: ["São Paulo"],
  RU: ["Moscow"],
};

const institutions = [
  "北京大学", "清华大学", "复旦大学", "上海交通大学", "浙江大学",
  "MIT", "Stanford University", "Harvard University", "Columbia University",
  "东京大学", "首尔大学", "NUS", "Imperial College London",
  "ETH Zurich", "University of Melbourne", "University of Toronto",
  "IIT Bombay", "HKU", "NTU Taiwan", "Goldman Sachs", "Morgan Stanley",
  "中国科学技术大学", "南京大学", "武汉大学", "中山大学", "同济大学",
  null, null, null, null, null,
];

const tiers: RankTier[] = ["iron", "bronze", "silver", "gold", "platinum", "diamond"];
const tierWeights = [30, 25, 20, 12, 8, 5];

function weightedTier(): RankTier {
  const total = tierWeights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < tiers.length; i++) {
    r -= tierWeights[i];
    if (r <= 0) return tiers[i];
  }
  return "iron";
}

function tierPoints(tier: RankTier): number {
  const ranges: Record<RankTier, [number, number]> = {
    iron: [0, 99], bronze: [100, 299], silver: [300, 599],
    gold: [600, 999], platinum: [1000, 1499], diamond: [1500, 3000],
  };
  const [min, max] = ranges[tier];
  return Math.floor(min + Math.random() * (max - min));
}

function randomIp(): string {
  return `${Math.floor(Math.random() * 200) + 10}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

const usernames = [
  "CryptoWolf", "TradeKing88", "AlphaHunter", "BullishDragon", "QuantMaster",
  "SilkRoadTrader", "NightOwlFX", "DiamondHands", "MoonShot", "DeepValue",
  "SwingKing", "ScalpMaster", "TrendRider", "BreakoutPro", "MomentumX",
  "GoldenRatio", "PivotPoint", "FibTrader", "IchimokuSage", "BollingerBoss",
  "RSI_Hunter", "MACD_Pro", "VolumeKing", "OrderFlow", "DeltaTrader",
  "SharpeRatio", "AlphaSeeker", "BetaNeutral", "GammaScalp", "ThetaDecay",
  "VegaLong", "RhoTrader", "BlackScholes", "MonteCarloX", "BayesianBull",
  "MarkovChain", "NeuralNet99", "DeepLearnFX", "GPT_Trader", "QuantumEdge",
  "HedgeFundJr", "WallStBets", "TradingView1", "ChartPatterns", "CandleStick",
  "DarkPool", "FlashCrash", "CircuitBreak", "MarketMaker", "LiquidityPro",
  "ArbitrageX", "PairsTrade", "StatArbPro", "MeanRevert", "TrendFollow",
  "BreakEvenBob", "StopLossKing", "TakeProfitQ", "RiskReward", "KellyCrit",
  "SortinoFan", "CalmarRatio", "MaxDrawdown", "RecoveryFact", "ProfitFactor",
  "WinRateWiz", "PayoffRatio", "ExpectancyX", "EdgeFinder", "SetupScout",
  "PatternPro", "PriceAction", "SmartMoney", "InstitFlow", "RetailRevolt",
  "ShortSqueeze", "GapTrader", "EarningsPlay", "DividendKing", "ValueHunter",
  "GrowthStock", "MicroCapGem", "PennyStock1", "BlueChipBull", "IndexFund",
  "ETF_Master", "OptionsSage", "PutWriter", "CallBuyer", "StraddlePro",
  "IronCondor", "ButterflyFX", "SpreadKing", "CoveredCall", "NakedPut",
  "FuturesKing", "ContangoX", "BackwardPro", "RollYield", "BasisTrade",
  "CryptoAlpha", "DeFiYield", "NFT_Trader", "Web3Bull", "BlockchainBet",
];

// ─── Generate Users ────────────────────────────────────────
export const users: User[] = Array.from({ length: 100 }, (_, i) => {
  const tier = weightedTier();
  const country = countries[Math.floor(Math.random() * countries.length)];
  const cityList = cities[country] || ["Unknown"];
  const inst = institutions[Math.floor(Math.random() * institutions.length)];
  const matchesPlayed = Math.floor(Math.random() * 50) + (tier === "diamond" ? 30 : tier === "platinum" ? 20 : 0);
  const totalPnl = (Math.random() - 0.3) * 5000 * (matchesPlayed + 1);
  const winRate = Math.min(85, Math.max(15, 45 + (Math.random() - 0.5) * 40));

  return {
    id: i + 1,
    username: usernames[i] || `Trader_${i + 1}`,
    displayName: Math.random() > 0.3 ? `${usernames[i] || `Trader ${i + 1}`}` : null,
    email: `${(usernames[i] || `trader${i + 1}`).toLowerCase()}@example.com`,
    ip: randomIp(),
    lastLoginIp: Math.random() > 0.7 ? randomIp() : randomIp(),
    country,
    region: Math.random() > 0.4 ? cityList[0] : null,
    city: cityList[Math.floor(Math.random() * cityList.length)],
    institutionName: inst,
    department: inst ? (Math.random() > 0.5 ? "Finance" : Math.random() > 0.5 ? "Computer Science" : "Economics") : null,
    graduationYear: inst ? (2020 + Math.floor(Math.random() * 7)) : null,
    participantType: inst ? (Math.random() > 0.3 ? "student" : "professional") : (Math.random() > 0.5 ? "professional" : "independent"),
    bio: Math.random() > 0.5 ? "Passionate trader focused on technical analysis and risk management." : null,
    rankTier: tier,
    seasonPoints: tierPoints(tier),
    capital: 5000 + totalPnl * 0.1,
    matchesPlayed,
    totalPnl: Math.round(totalPnl * 100) / 100,
    totalPrize: Math.round(Math.max(0, totalPnl * 0.02) * 100) / 100,
    winRate: Math.round(winRate * 10) / 10,
    bestRank: Math.max(1, Math.floor(Math.random() * (tier === "diamond" ? 5 : tier === "platinum" ? 15 : 50))),
    isProfilePublic: Math.random() > 0.2,
    isBanned: Math.random() < 0.03,
    createdAt: now - Math.floor(Math.random() * 90) * day,
    lastLoginAt: now - Math.floor(Math.random() * 7) * day - Math.floor(Math.random() * 24) * hour,
    registrationSource: Math.random() > 0.6 ? "organic" : Math.random() > 0.5 ? "referral" : "social",
  };
});

// ─── Generate Competitions ─────────────────────────────────
export const competitions: Competition[] = [
  {
    id: 1, slug: "s1-week-1", title: "Season 1 · 第1周常规赛", competitionNumber: 1,
    competitionType: "regular", status: "completed", seasonId: 1, maxParticipants: 100,
    registeredCount: 87, acceptedCount: 85, prizePool: 500, symbol: "BTCUSDT",
    startTime: now - 30 * day, endTime: now - 29 * day,
    registrationOpenAt: now - 35 * day, registrationCloseAt: now - 31 * day,
    startingCapital: 5000, description: "第一周常规赛，BTC/USDT交易对",
  },
  {
    id: 2, slug: "s1-week-2", title: "Season 1 · 第2周常规赛", competitionNumber: 2,
    competitionType: "regular", status: "completed", seasonId: 1, maxParticipants: 100,
    registeredCount: 92, acceptedCount: 90, prizePool: 500, symbol: "BTCUSDT",
    startTime: now - 23 * day, endTime: now - 22 * day,
    registrationOpenAt: now - 28 * day, registrationCloseAt: now - 24 * day,
    startingCapital: 5000, description: "第二周常规赛",
  },
  {
    id: 3, slug: "s1-week-3", title: "Season 1 · 第3周常规赛", competitionNumber: 3,
    competitionType: "regular", status: "completed", seasonId: 1, maxParticipants: 100,
    registeredCount: 95, acceptedCount: 93, prizePool: 500, symbol: "BTCUSDT",
    startTime: now - 16 * day, endTime: now - 15 * day,
    registrationOpenAt: now - 21 * day, registrationCloseAt: now - 17 * day,
    startingCapital: 5000, description: "第三周常规赛",
  },
  {
    id: 4, slug: "s1-week-4", title: "Season 1 · 第4周常规赛", competitionNumber: 4,
    competitionType: "regular", status: "live", seasonId: 1, maxParticipants: 100,
    registeredCount: 98, acceptedCount: 78, prizePool: 500, symbol: "BTCUSDT",
    startTime: now - 2 * hour, endTime: now + 22 * hour,
    registrationOpenAt: now - 7 * day, registrationCloseAt: now - 1 * day,
    startingCapital: 5000, description: "第四周常规赛，进行中",
  },
  {
    id: 5, slug: "s1-week-5", title: "Season 1 · 第5周常规赛", competitionNumber: 5,
    competitionType: "regular", status: "registration_open", seasonId: 1, maxParticipants: 100,
    registeredCount: 45, acceptedCount: 12, prizePool: 500, symbol: "BTCUSDT",
    startTime: now + 5 * day, endTime: now + 6 * day,
    registrationOpenAt: now - 2 * day, registrationCloseAt: now + 3 * day,
    startingCapital: 5000, description: "第五周常规赛，报名中",
  },
  {
    id: 6, slug: "s1-special-1", title: "Season 1 · 特别赛：ETH挑战", competitionNumber: 6,
    competitionType: "special", status: "announced", seasonId: 1, maxParticipants: 50,
    registeredCount: 0, acceptedCount: 0, prizePool: 1000, symbol: "ETHUSDT",
    startTime: now + 12 * day, endTime: now + 13 * day,
    registrationOpenAt: now + 5 * day, registrationCloseAt: now + 10 * day,
    startingCapital: 5000, description: "特别赛，仅限Gold以上段位",
  },
  {
    id: 7, slug: "s1-grand-final", title: "Season 1 · 总决赛", competitionNumber: 7,
    competitionType: "grand_final", status: "draft", seasonId: 1, maxParticipants: 30,
    registeredCount: 0, acceptedCount: 0, prizePool: 5000, symbol: "BTCUSDT",
    startTime: now + 30 * day, endTime: now + 31 * day,
    registrationOpenAt: null, registrationCloseAt: null,
    startingCapital: 10000, description: "赛季总决赛，仅限Platinum以上段位",
  },
];

// ─── Generate Registrations ────────────────────────────────
export const registrations: Registration[] = [];
let regId = 1;
for (const comp of competitions) {
  if (comp.registeredCount === 0) continue;
  const shuffled = [...users].sort(() => Math.random() - 0.5);
  const count = comp.registeredCount;
  for (let i = 0; i < count && i < shuffled.length; i++) {
    const u = shuffled[i];
    let status: RegistrationStatus;
    if (i < comp.acceptedCount) status = "accepted";
    else if (comp.status === "registration_open" && Math.random() > 0.3) status = "pending";
    else status = Math.random() > 0.7 ? "rejected" : "pending";

    registrations.push({
      id: regId++,
      competitionId: comp.id,
      competitionTitle: comp.title,
      arenaAccountId: u.id,
      username: u.username,
      status,
      seasonPoints: u.seasonPoints,
      rankTier: u.rankTier,
      matchesPlayed: u.matchesPlayed,
      institutionName: u.institutionName,
      country: u.country,
      appliedAt: (comp.registrationOpenAt || comp.startTime - 7 * day) + Math.floor(Math.random() * 5 * day),
      reviewedAt: status !== "pending" ? (comp.registrationOpenAt || comp.startTime - 7 * day) + Math.floor(Math.random() * 6 * day) : null,
    });
  }
}

// ─── Generate Chat Messages ───────────────────────────────
const chatTemplates = [
  "刚开了一个多单，感觉BTC要突破了！",
  "大家注意风控，今天波动很大",
  "这波行情太刺激了，已经翻倍了",
  "止损被打了，心态崩了",
  "请问大家用什么策略？",
  "恭喜第一名！太强了",
  "这个比赛规则很公平",
  "有没有人一起讨论技术分析？",
  "MACD金叉了，准备入场",
  "小心假突破，等确认再进",
  "今天的交易量不错",
  "建议大家控制好仓位",
  "这波空单赚麻了",
  "谁能教教我怎么设止损？",
  "加油加油！冲前十！",
  "市场情绪偏多，注意回调风险",
  "刚才那根大阳线太猛了",
  "我觉得现在应该观望",
  "有人在做ETH吗？",
  "这个平台体验很好",
  "垃圾平台，操纵价格！",
  "fuck this market",
  "管理员在吗？有bug要反馈",
  "广告：加我微信带你赚钱",
  "这比赛太难了，放弃了",
  "恭喜所有获奖选手！",
  "下周的比赛什么时候开始报名？",
  "技术分析就是玄学",
  "量化交易才是王道",
  "手动交易的乐趣在于判断力",
];

export const chatMessages: ChatMessage[] = [];
let msgId = 1;
for (const comp of competitions.filter(c => ["completed", "live"].includes(c.status))) {
  const msgCount = comp.status === "live" ? 40 + Math.floor(Math.random() * 30) : 60 + Math.floor(Math.random() * 40);
  for (let i = 0; i < msgCount; i++) {
    const u = users[Math.floor(Math.random() * 60)];
    const template = chatTemplates[Math.floor(Math.random() * chatTemplates.length)];
    let status: ChatMessageStatus = "visible";
    if (template.includes("垃圾") || template.includes("fuck") || template.includes("广告")) {
      status = Math.random() > 0.3 ? "hidden" : "deleted";
    } else if (Math.random() < 0.02) {
      status = "hidden";
    }

    chatMessages.push({
      id: msgId++,
      competitionId: comp.id,
      competitionTitle: comp.title,
      userId: u.id,
      username: u.username,
      rankTier: u.rankTier,
      message: template,
      status,
      createdAt: comp.startTime + Math.floor(Math.random() * (comp.endTime - comp.startTime)),
      moderatedAt: status !== "visible" ? now - Math.floor(Math.random() * 3 * day) : null,
      moderatedBy: status !== "visible" ? "Admin" : null,
    });
  }
}
chatMessages.sort((a, b) => b.createdAt - a.createdAt);

// ─── Generate Match Results ────────────────────────────────
export const matchResults: MatchResult[] = [];
let mrId = 1;
for (const comp of competitions.filter(c => c.status === "completed")) {
  const participants = registrations
    .filter(r => r.competitionId === comp.id && r.status === "accepted")
    .sort(() => Math.random() - 0.5);

  participants.forEach((reg, idx) => {
    const rank = idx + 1;
    const pnlPct = (Math.random() - 0.3) * 30 - idx * 0.2;
    const pnl = comp.startingCapital * pnlPct / 100;
    const trades = Math.floor(Math.random() * 35) + 5;
    const wins = Math.floor(trades * (0.3 + Math.random() * 0.4));

    let prize = 0;
    if (rank <= 1) prize = 55;
    else if (rank <= 2) prize = 35;
    else if (rank <= 3) prize = 25;
    else if (rank <= 5) prize = 15;
    else if (rank <= 10) prize = 10;
    else if (rank <= 20) prize = 6;
    else if (rank <= 50) prize = 4;

    let points = 0;
    if (rank <= 1) points = 100;
    else if (rank <= 3) points = 70;
    else if (rank <= 10) points = 50;
    else if (rank <= 50) points = 30;
    else points = 15;

    matchResults.push({
      id: mrId++,
      competitionId: comp.id,
      competitionTitle: comp.title,
      arenaAccountId: reg.arenaAccountId,
      username: reg.username,
      finalRank: rank,
      totalPnl: Math.round(pnl * 100) / 100,
      totalPnlPct: Math.round(pnlPct * 100) / 100,
      tradesCount: trades,
      winCount: wins,
      lossCount: trades - wins,
      pointsEarned: points,
      prizeWon: prize,
      prizeEligible: trades >= 5,
      participantCount: participants.length,
      createdAt: comp.endTime + Math.floor(Math.random() * hour),
    });
  });
}

// ─── Stats Helpers ─────────────────────────────────────────
export const TIER_CONFIG: Record<RankTier, { label: string; color: string; minPoints: number }> = {
  iron: { label: "Iron", color: "#5E6673", minPoints: 0 },
  bronze: { label: "Bronze", color: "#CD7F32", minPoints: 100 },
  silver: { label: "Silver", color: "#C0C0C0", minPoints: 300 },
  gold: { label: "Gold", color: "#F0B90B", minPoints: 600 },
  platinum: { label: "Platinum", color: "#00D4AA", minPoints: 1000 },
  diamond: { label: "Diamond", color: "#B9F2FF", minPoints: 1500 },
};

export const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#F0B90B" },
  accepted: { label: "已通过", color: "#0ECB81" },
  rejected: { label: "已拒绝", color: "#F6465D" },
  withdrawn: { label: "已撤回", color: "#5E6673" },
  waitlisted: { label: "候补", color: "#848E9C" },
  draft: { label: "草稿", color: "#5E6673" },
  announced: { label: "已公告", color: "#3B82F6" },
  registration_open: { label: "报名中", color: "#0ECB81" },
  registration_closed: { label: "报名截止", color: "#F0B90B" },
  live: { label: "进行中", color: "#0ECB81" },
  settling: { label: "结算中", color: "#F0B90B" },
  completed: { label: "已结束", color: "#848E9C" },
  cancelled: { label: "已取消", color: "#F6465D" },
  visible: { label: "可见", color: "#0ECB81" },
  hidden: { label: "已隐藏", color: "#F0B90B" },
  deleted: { label: "已删除", color: "#F6465D" },
};

export const COMP_TYPE_CONFIG: Record<CompetitionType, { label: string; color: string }> = {
  regular: { label: "常规赛", color: "#3B82F6" },
  grand_final: { label: "总决赛", color: "#F0B90B" },
  special: { label: "特别赛", color: "#A855F7" },
  practice: { label: "练习赛", color: "#848E9C" },
};

// ─── Platform Stats ────────────────────────────────────────
export function getPlatformStats() {
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.lastLoginAt > now - 7 * day).length;
  const bannedUsers = users.filter(u => u.isBanned).length;
  const totalCompetitions = competitions.length;
  const liveCompetitions = competitions.filter(c => c.status === "live").length;
  const totalTrades = matchResults.reduce((s, r) => s + r.tradesCount, 0);
  const totalPrize = matchResults.reduce((s, r) => s + r.prizeWon, 0);
  const pendingRegistrations = registrations.filter(r => r.status === "pending").length;
  const totalMessages = chatMessages.length;
  const flaggedMessages = chatMessages.filter(m => m.status !== "visible").length;

  const tierDistribution = tiers.map(t => ({
    tier: t,
    count: users.filter(u => u.rankTier === t).length,
    ...TIER_CONFIG[t],
  }));

  const countryDistribution = countries.map(c => ({
    country: c,
    count: users.filter(u => u.country === c).length,
  })).sort((a, b) => b.count - a.count);

  const registrationTrend = Array.from({ length: 14 }, (_, i) => {
    const dayStart = now - (13 - i) * day;
    const dayEnd = dayStart + day;
    return {
      date: new Date(dayStart).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
      count: users.filter(u => u.createdAt >= dayStart && u.createdAt < dayEnd).length,
    };
  });

  return {
    totalUsers, activeUsers, bannedUsers, totalCompetitions, liveCompetitions,
    totalTrades, totalPrize: Math.round(totalPrize * 100) / 100,
    pendingRegistrations, totalMessages, flaggedMessages,
    tierDistribution, countryDistribution, registrationTrend,
  };
}
