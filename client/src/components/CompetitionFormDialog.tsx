/**
 * CompetitionFormDialog — Create or edit a competition
 * Reusable dialog with all fields from createCompetitionSchema
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Upload, ImageIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import type { CompetitionType } from "@/lib/constants";

interface BinanceSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

/** Fetch all Binance USDⓈ-M perpetual symbols (cached in module scope) */
let cachedSymbols: BinanceSymbolInfo[] | null = null;
async function fetchBinanceSymbols(): Promise<BinanceSymbolInfo[]> {
  if (cachedSymbols) return cachedSymbols;
  try {
    const res = await fetch("https://fapi.binance.com/fapi/v1/exchangeInfo");
    const data = await res.json();
    cachedSymbols = (data.symbols as any[])
      .filter((s: any) =>
        (s.contractType === "PERPETUAL" || s.contractType === "TRADIFI_PERPETUAL") &&
        s.status === "TRADING" &&
        (s.quoteAsset === "USDT" || s.quoteAsset === "USDC")
      )
      .map((s: any) => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
      }))
      .sort((a: BinanceSymbolInfo, b: BinanceSymbolInfo) => a.symbol.localeCompare(b.symbol));
    return cachedSymbols;
  } catch {
    return [];
  }
}

interface CompetitionFormData {
  seasonId: number;
  title: string;
  slug: string;
  description: string;
  competitionNumber: number;
  competitionType: CompetitionType;
  maxParticipants: number;
  minParticipants: number;
  registrationOpenAt: string;
  registrationCloseAt: string;
  startTime: string;
  endTime: string;
  symbol: string;
  startingCapital: number;
  maxTradesPerMatch: number;
  closeOnlySeconds: number;
  feeRate: number;
  prizePool: number;
  requireMinSeasonPoints: number;
  requireMinTier: string;
  inviteOnly: boolean;
  coverImageUrl: string;
}

const defaultForm: CompetitionFormData = {
  seasonId: 0,
  title: "",
  slug: "",
  description: "",
  competitionNumber: 1,
  competitionType: "regular",
  maxParticipants: 50,
  minParticipants: 5,
  registrationOpenAt: "",
  registrationCloseAt: "",
  startTime: "",
  endTime: "",
  symbol: "SOLUSDT",
  startingCapital: 5000,
  maxTradesPerMatch: 40,
  closeOnlySeconds: 1800,
  feeRate: 0.0005,
  prizePool: 500,
  requireMinSeasonPoints: 0,
  requireMinTier: "",
  inviteOnly: false,
  coverImageUrl: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** If provided, form is in edit mode */
  editData?: {
    id: number;
    seasonId: number;
    title: string;
    slug: string;
    description?: string | null;
    competitionNumber: number;
    competitionType: string;
    maxParticipants: number;
    startTime: number;
    endTime: number;
    registrationOpenAt?: number | null;
    registrationCloseAt?: number | null;
    symbol: string;
    startingCapital: number;
    prizePool: number;
    coverImageUrl?: string | null;
  };
}

function tsToDatetimeLocal(ts: number | null | undefined): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CompetitionFormDialog({ open, onClose, editData }: Props) {
  const [form, setForm] = useState<CompetitionFormData>(defaultForm);
  const [allSymbols, setAllSymbols] = useState<BinanceSymbolInfo[]>([]);
  const [symbolSearch, setSymbolSearch] = useState("");
  const utils = trpc.useUtils();
  const { data: seasons } = trpc.seasons.list.useQuery();

  // Fetch Binance symbols on mount
  useEffect(() => {
    fetchBinanceSymbols().then(setAllSymbols);
  }, []);

  const filteredSymbols = useMemo(() => {
    if (!symbolSearch) return allSymbols;
    const q = symbolSearch.toUpperCase();
    return allSymbols.filter(s => s.symbol.includes(q) || s.baseAsset.includes(q));
  }, [allSymbols, symbolSearch]);

  const isEdit = !!editData;

  useEffect(() => {
    if (editData) {
      setForm({
        ...defaultForm,
        seasonId: editData.seasonId,
        title: editData.title,
        slug: editData.slug,
        description: editData.description || "",
        competitionNumber: editData.competitionNumber,
        competitionType: editData.competitionType as CompetitionType,
        maxParticipants: editData.maxParticipants,
        startTime: tsToDatetimeLocal(editData.startTime),
        endTime: tsToDatetimeLocal(editData.endTime),
        registrationOpenAt: tsToDatetimeLocal(editData.registrationOpenAt),
        registrationCloseAt: tsToDatetimeLocal(editData.registrationCloseAt),
        symbol: editData.symbol,
        startingCapital: editData.startingCapital,
        prizePool: editData.prizePool,
        coverImageUrl: editData.coverImageUrl || "",
      });
    } else {
      setForm(defaultForm);
    }
  }, [editData, open]);

  const createMutation = trpc.competitions.create.useMutation({
    onSuccess: () => {
      toast.success("比赛创建成功");
      utils.competitions.list.invalidate();
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.competitions.update.useMutation({
    onSuccess: () => {
      toast.success("比赛更新成功");
      utils.competitions.list.invalidate();
      onClose();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const uploadCoverMutation = trpc.competitions.uploadCover.useMutation({
    onSuccess: (data) => {
      set("coverImageUrl", data.url);
      toast.success("封面上传成功");
    },
    onError: (err: any) => toast.error(`上传失败: ${err.message}`),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCoverUpload = async (file: File) => {
    if (!file.type.match(/^image\/(jpeg|png|webp|gif)$/)) {
      toast.error("仅支持 JPG/PNG/WebP/GIF");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("图片不能超过 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      if (isEdit && editData) {
        uploadCoverMutation.mutate({
          competitionId: editData.id,
          base64,
          mimeType: file.type,
        });
      } else {
        // For create mode, convert to data URL for preview; actual upload happens after create
        set("coverImageUrl", reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = () => {
    if (!form.title || !form.slug || !form.startTime || !form.endTime || !form.seasonId) {
      toast.error("请填写所有必填字段（赛季、标题、slug、开始/结束时间）");
      return;
    }

    const toTs = (v: string) => v ? new Date(v).getTime() : undefined;

    if (isEdit && editData) {
      updateMutation.mutate({
        id: editData.id,
        data: {
          title: form.title,
          slug: form.slug,
          description: form.description || undefined,
          competitionType: form.competitionType,
          maxParticipants: form.maxParticipants,
          minParticipants: form.minParticipants,
          registrationOpenAt: toTs(form.registrationOpenAt),
          registrationCloseAt: toTs(form.registrationCloseAt),
          startTime: toTs(form.startTime)!,
          endTime: toTs(form.endTime)!,
          symbol: form.symbol,
          startingCapital: form.startingCapital,
          maxTradesPerMatch: form.maxTradesPerMatch,
          closeOnlySeconds: form.closeOnlySeconds,
          feeRate: form.feeRate,
          prizePool: form.prizePool,
          requireMinSeasonPoints: form.requireMinSeasonPoints,
          requireMinTier: form.requireMinTier || undefined,
          inviteOnly: form.inviteOnly,
          coverImageUrl: form.coverImageUrl || undefined,
        },
      });
    } else {
      createMutation.mutate({
        seasonId: form.seasonId,
        title: form.title,
        slug: form.slug,
        description: form.description || undefined,
        competitionNumber: form.competitionNumber,
        competitionType: form.competitionType,
        maxParticipants: form.maxParticipants,
        minParticipants: form.minParticipants,
        registrationOpenAt: toTs(form.registrationOpenAt),
        registrationCloseAt: toTs(form.registrationCloseAt),
        startTime: toTs(form.startTime)!,
        endTime: toTs(form.endTime)!,
        symbol: form.symbol,
        startingCapital: form.startingCapital,
        maxTradesPerMatch: form.maxTradesPerMatch,
        closeOnlySeconds: form.closeOnlySeconds,
        feeRate: form.feeRate,
        prizePool: form.prizePool,
        requireMinSeasonPoints: form.requireMinSeasonPoints,
        requireMinTier: form.requireMinTier || undefined,
        inviteOnly: form.inviteOnly,
        coverImageUrl: form.coverImageUrl || undefined,
      });
    }
  };

  const autoSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64);
  };

  const set = <K extends keyof CompetitionFormData>(key: K, val: CompetitionFormData[K]) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center overflow-y-auto py-8"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          className="bg-card border border-border rounded-xl w-full max-w-2xl mx-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-display text-lg font-bold text-foreground">
              {isEdit ? "编辑比赛" : "创建新比赛"}
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">基本信息</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">所属赛季 *</label>
                  <select
                    value={form.seasonId}
                    onChange={(e) => set("seasonId", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  >
                    <option value={0}>选择赛季...</option>
                    {(seasons || []).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">比赛类型</label>
                  <select
                    value={form.competitionType}
                    onChange={(e) => set("competitionType", e.target.value as CompetitionType)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  >
                    <option value="regular">常规赛</option>
                    <option value="grand_final">总决赛</option>
                    <option value="special">特别赛</option>
                    <option value="practice">练习赛</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">标题 *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => {
                      set("title", e.target.value);
                      if (!isEdit) set("slug", autoSlug(e.target.value));
                    }}
                    placeholder="Week 1 Regular"
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Slug *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B] resize-none"
                />
              </div>
              {/* Cover Image Upload */}
              <div>
                <label className="block text-xs text-muted-foreground mb-1">封面图片</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                    e.target.value = "";
                  }}
                />
                {form.coverImageUrl ? (
                  <div className="relative group">
                    <img
                      src={form.coverImageUrl}
                      alt="封面预览"
                      className="w-full h-36 object-cover rounded-lg border border-border"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white/20 text-white text-xs rounded-lg hover:bg-white/30"
                      >
                        {uploadCoverMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "替换"}
                      </button>
                      <button
                        type="button"
                        onClick={() => set("coverImageUrl", "")}
                        className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs rounded-lg hover:bg-red-500/30"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-28 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-[#F0B90B]/50 hover:text-foreground transition-colors"
                  >
                    {uploadCoverMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-xs">点击上传封面图 (JPG/PNG/WebP, max 5MB)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {!isEdit && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">比赛编号</label>
                    <input
                      type="number"
                      value={form.competitionNumber}
                      onChange={(e) => set("competitionNumber", Number(e.target.value))}
                      min={1}
                      className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Time Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">时间设置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">报名开放时间</label>
                  <input type="datetime-local" value={form.registrationOpenAt}
                    onChange={(e) => set("registrationOpenAt", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">报名截止时间</label>
                  <input type="datetime-local" value={form.registrationCloseAt}
                    onChange={(e) => set("registrationCloseAt", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">比赛开始时间 *</label>
                  <input type="datetime-local" value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">比赛结束时间 *</label>
                  <input type="datetime-local" value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
              </div>
            </div>

            {/* Participation Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">参赛设置</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">最大参与者</label>
                  <input type="number" value={form.maxParticipants}
                    onChange={(e) => set("maxParticipants", Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">最少参与者</label>
                  <input type="number" value={form.minParticipants}
                    onChange={(e) => set("minParticipants", Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">最低积分要求</label>
                  <input type="number" value={form.requireMinSeasonPoints}
                    onChange={(e) => set("requireMinSeasonPoints", Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">最低段位要求</label>
                  <select
                    value={form.requireMinTier}
                    onChange={(e) => set("requireMinTier", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  >
                    <option value="">无要求</option>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                    <option value="diamond">Diamond</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.inviteOnly}
                      onChange={(e) => set("inviteOnly", e.target.checked)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">仅限邀请</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Trading Settings */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">交易设置</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="relative">
                  <label className="block text-xs text-muted-foreground mb-1">交易对 ({allSymbols.length} 个可用)</label>
                  <input
                    type="text"
                    value={symbolSearch || form.symbol}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setSymbolSearch(val);
                      // Auto-select if exact match
                      if (allSymbols.some(s => s.symbol === val)) {
                        set("symbol", val);
                        setSymbolSearch("");
                      }
                    }}
                    onFocus={() => setSymbolSearch(form.symbol)}
                    onBlur={() => {
                      // Delay to allow click on dropdown
                      setTimeout(() => setSymbolSearch(""), 200);
                    }}
                    placeholder="搜索币对，如 BTC、ETH、SOL..."
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                  {symbolSearch && filteredSymbols.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-secondary border border-border shadow-lg">
                      {filteredSymbols.slice(0, 50).map((s) => (
                        <button
                          key={s.symbol}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-[#F0B90B]/10 ${
                            form.symbol === s.symbol ? "text-[#F0B90B]" : "text-foreground"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            set("symbol", s.symbol);
                            setSymbolSearch("");
                          }}
                        >
                          {s.baseAsset}/{s.quoteAsset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">初始资金</label>
                  <input type="number" value={form.startingCapital}
                    onChange={(e) => set("startingCapital", Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">最大交易次数</label>
                  <input type="number" value={form.maxTradesPerMatch}
                    onChange={(e) => set("maxTradesPerMatch", Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">平仓期 (秒)</label>
                  <input type="number" value={form.closeOnlySeconds}
                    onChange={(e) => set("closeOnlySeconds", Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">手续费率</label>
                  <input type="number" value={form.feeRate} step="0.0001"
                    onChange={(e) => set("feeRate", Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">奖金池 (USDT)</label>
                  <input type="number" value={form.prizePool}
                    onChange={(e) => set("prizePool", Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#F0B90B]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F0B90B] text-black text-sm font-semibold hover:bg-[#F0B90B]/90 transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "保存修改" : "确认创建"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
