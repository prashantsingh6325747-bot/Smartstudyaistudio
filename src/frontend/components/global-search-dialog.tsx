import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Search, FileText, BookOpen, ExternalLink, Loader2 } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { globalSearch } from "@/backend/academic-content.functions";

export function GlobalSearchDialog({
  open,
  onOpenChange,
  onSelectDocument,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDocument?: (docId: string, type: "material" | "book") => void;
}) {
  const [query, setQuery] = useState("");

  const searchMutation = useMutation({
    mutationFn: (q: string) => globalSearch({ data: { query: q } }),
  });

  const handleSearch = (val: string) => {
    setQuery(val);
    if (val.trim().length >= 2) {
      searchMutation.mutate(val);
    }
  };

  const results = searchMutation.data;
  const hasResults = (results?.materials.length ?? 0) > 0 || (results?.books.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden sm:rounded-xl">
        <div className="flex items-center border-b border-border px-4 py-3">
          <Search className="size-5 text-muted-foreground mr-3 shrink-0" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search notes, PYQs, books, lab manuals, syllabus..."
            className="border-0 shadow-none focus-visible:ring-0 text-base h-10 px-0"
            autoFocus
          />
          {searchMutation.isPending ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground ml-2" />
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {query.trim().length < 2 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Type at least 2 characters to search across permitted MITS academic content.
            </div>
          ) : searchMutation.isPending ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Searching academic repository...
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching notes, books, or PYQs found in your academic space.
            </div>
          ) : (
            <>
              {results?.materials && results.materials.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Academic Documents & Notes ({results.materials.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.materials.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          onOpenChange(false);
                          onSelectDocument?.(m.id, "material");
                        }}
                        className="group flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-secondary/70 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="size-4 text-primary shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {m.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {m.subjectName} {m.chapterName ? `· ${m.chapterName}` : ""}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {m.documentType.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results?.books && results.books.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Digital Library Books ({results.books.length})
                  </h4>
                  <div className="space-y-1.5">
                    {results.books.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => {
                          onOpenChange(false);
                          onSelectDocument?.(b.id, "book");
                        }}
                        className="group flex items-center justify-between p-2.5 rounded-lg border border-border/50 hover:bg-secondary/70 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <BookOpen className="size-4 text-blue-500 shrink-0" />
                          <div className="truncate">
                            <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                              {b.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">by {b.author}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {b.category}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
