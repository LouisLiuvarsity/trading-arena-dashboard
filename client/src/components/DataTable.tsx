import { useState, useMemo, type ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  render: (row: T) => ReactNode;
  getValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchPlaceholder?: string;
  searchFn?: (row: T, query: string) => boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  actions?: ReactNode;
  bulkActions?: ReactNode;
  selectedIds?: Set<number>;
  onSelectToggle?: (id: number) => void;
  onSelectAll?: () => void;
  getRowId?: (row: T) => number;
}

export default function DataTable<T>({
  data,
  columns,
  pageSize = 15,
  searchPlaceholder = "搜索...",
  searchFn,
  onRowClick,
  emptyMessage = "暂无数据",
  actions,
  bulkActions,
  selectedIds,
  onSelectToggle,
  onSelectAll,
  getRowId,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search || !searchFn) return data;
    return data.filter((row) => searchFn(row, search.toLowerCase()));
  }, [data, search, searchFn]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.getValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.getValue!(a);
      const vb = col.getValue!(b);
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allSelected = selectedIds && getRowId && paged.length > 0 && paged.every((r) => selectedIds.has(getRowId(r)));

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {searchFn && (
            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          )}
          {selectedIds && selectedIds.size > 0 && bulkActions}
        </div>
        {actions}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {selectedIds && onSelectToggle && (
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onSelectAll}
                    className="w-3.5 h-3.5 rounded border-border bg-secondary text-primary focus:ring-ring"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""}`}
                  style={{ width: col.width }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      sortKey === col.key
                        ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                        : <ChevronsUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectedIds ? 1 : 0)} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, idx) => {
                const rowId = getRowId?.(row);
                const isSelected = rowId !== undefined && selectedIds?.has(rowId);
                return (
                  <tr
                    key={idx}
                    className={`transition-colors ${onRowClick ? "cursor-pointer" : ""} ${isSelected ? "bg-[oklch(0.82_0.15_85/5%)]" : "hover:bg-secondary/50"}`}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectedIds && onSelectToggle && rowId !== undefined && (
                      <td className="w-10 px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectToggle(rowId)}
                          className="w-3.5 h-3.5 rounded border-border bg-secondary text-primary focus:ring-ring"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"}`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            共 <span className="font-mono font-semibold text-foreground">{sorted.length}</span> 条，
            第 {page + 1}/{totalPages} 页
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i;
              } else if (page < 3) {
                pageNum = i;
              } else if (page > totalPages - 4) {
                pageNum = totalPages - 5 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${page === pageNum ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
