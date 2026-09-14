import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  Bookmark,
  Eye,
  Download,
  BookMarked,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import {
  listLibraryBooks,
  toggleBookmark,
  trackDocumentView,
} from "@/backend/academic-content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { LibraryBookDTO, LibraryCategory, UserDTO } from "@/shared/types";

export function DigitalLibrarySection({
  user,
  onOpenAiWithContext,
}: {
  user: UserDTO;
  onOpenAiWithContext?: (book: LibraryBookDTO) => void;
}) {
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewBook, setPreviewBook] = useState<LibraryBookDTO | null>(null);

  const booksQuery = useQuery({
    queryKey: ["library-books", activeCategory, searchQuery],
    queryFn: () =>
      listLibraryBooks({
        data: {
          category: activeCategory === "All" ? undefined : activeCategory,
          search: searchQuery || undefined,
        },
      }),
  });

  const bookmarkMutation = useMutation({
    mutationFn: (documentId: string) => toggleBookmark({ data: { documentId, itemType: "book" } }),
    onSuccess: (res) => {
      toast.success(res.bookmarked ? "Bookmarked to personal library" : "Removed bookmark");
      queryClient.invalidateQueries({ queryKey: ["library-books"] });
    },
  });

  const trackViewMutation = useMutation({
    mutationFn: (id: string) => trackDocumentView({ data: { id, type: "book" } }),
  });

  const handleRead = (book: LibraryBookDTO) => {
    setPreviewBook(book);
    trackViewMutation.mutate(book.id);
  };

  const categories = ["All", "Textbook", "Reference Book", "E-book", "Lab Manual", "Question Bank"];

  const books = booksQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground">MITS Digital Library</h3>
            <Badge
              variant="outline"
              className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            >
              Institutional Repository
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Standard textbooks, IEEE reference manuals, curated e-books, and university question
            banks.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, author, subject..."
            className="pl-8 text-xs h-9"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            className="text-xs rounded-full h-8 shrink-0"
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "All" ? "All Categories" : cat}
          </Button>
        ))}
      </div>

      {/* Books Grid */}
      {booksQuery.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-52 rounded-xl border border-border/60 bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <BookOpen className="size-8 mx-auto text-muted-foreground/60 mb-2" />
          <p className="text-sm font-medium text-foreground">No books or publications found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Authorized librarians or faculty can upload publications from the teacher space.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <Card
              key={book.id}
              className="group flex flex-col justify-between border-border/70 hover:border-blue-500/50 transition-all shadow-sm hover:shadow-md"
            >
              <CardHeader className="p-4 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  >
                    {book.category}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => bookmarkMutation.mutate(book.id)}
                    className="text-muted-foreground hover:text-amber-500 transition-colors p-1"
                  >
                    <Bookmark
                      className={`size-4 ${book.isBookmarked ? "fill-amber-500 text-amber-500" : ""}`}
                    />
                  </button>
                </div>

                <CardTitle className="text-sm font-semibold line-clamp-2 mt-2 group-hover:text-primary transition-colors">
                  {book.title}
                </CardTitle>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">by {book.author}</p>
                <CardDescription className="text-xs line-clamp-2 mt-1">
                  {book.description || "Digital volume deposited in MITS library."}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/50 pt-2.5">
                  <span>{book.edition || "Standard Edition"}</span>
                  <span>{book.pages ? `${book.pages} Pages` : "Digital Volume"}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => handleRead(book)}
                  >
                    <Eye className="size-3.5 mr-1" /> Read / View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    title="Consult AI with this reference book"
                    onClick={() => onOpenAiWithContext?.(book)}
                  >
                    <Sparkles className="size-3.5 text-primary" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Book Reader Modal */}
      <Dialog open={Boolean(previewBook)} onOpenChange={(o) => !o && setPreviewBook(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-xl">
          {previewBook && (
            <>
              <DialogHeader className="p-5 border-b border-border/70 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {previewBook.category}
                  </Badge>
                  {previewBook.subjectName && (
                    <Badge variant="secondary" className="text-xs">
                      {previewBook.subjectName}
                    </Badge>
                  )}
                </div>
                <DialogTitle className="text-lg font-semibold">{previewBook.title}</DialogTitle>
                <DialogDescription className="text-xs">
                  By {previewBook.author} · {previewBook.edition || "Standard Publication"}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 overflow-y-auto space-y-4 text-sm leading-relaxed">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    Catalog Abstract & Book Summary
                  </h4>
                  <p className="text-foreground/90 bg-muted/40 p-3 rounded-lg border border-border/40 text-xs">
                    {previewBook.description}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      Digital Lending & PDF Stream
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Access authorized for active MITS students and faculty.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toast.info(`Accessing ${previewBook.title}`)}
                  >
                    <Download className="size-4 mr-1.5" /> Download ePub/PDF
                  </Button>
                </div>
              </div>

              <div className="p-4 border-t border-border/70 bg-card flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  ISBN: {previewBook.isbn || "MITS-LIB-REF-2025"}
                </span>

                <Button
                  size="sm"
                  onClick={() => {
                    const b = previewBook;
                    setPreviewBook(null);
                    onOpenAiWithContext?.(b);
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Sparkles className="size-4 mr-1.5" /> Ask AI to Summarize Chapter
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
