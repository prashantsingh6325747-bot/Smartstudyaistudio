import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Send,
  Bot,
  User,
  History,
  BookOpen,
  FileText,
  FileQuestion,
  HelpCircle,
  Clock,
  PlusCircle,
  Loader2,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";

import {
  askAIAssistant,
  listChatConversations,
  getChatConversation,
} from "@/backend/ai-assistant.functions";
import { listSubjects } from "@/backend/academic-content.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AIChatMessageDTO, AICitation, UserDTO } from "@/shared/types";

export function AIStudyAssistantSection({
  user,
  initialQuestion,
  initialSubjectId,
}: {
  user: UserDTO;
  initialQuestion?: string;
  initialSubjectId?: string;
}) {
  const queryClient = useQueryClient();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubjectId || "all");
  const [question, setQuestion] = useState(initialQuestion || "");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIChatMessageDTO[]>([]);

  const subjectsQuery = useQuery({
    queryKey: ["subjects", user.programId, user.semester],
    queryFn: () => listSubjects({ data: {} }),
  });

  const historyQuery = useQuery({
    queryKey: ["ai-chat-history"],
    queryFn: () => listChatConversations(),
  });

  const loadConvMutation = useMutation({
    mutationFn: (id: string) => getChatConversation({ data: { id } }),
    onSuccess: (res) => {
      setActiveConversationId(res.conversation.id);
      setMessages(res.messages);
      if (res.conversation.subjectId) {
        setSelectedSubjectId(res.conversation.subjectId);
      }
    },
  });

  const askMutation = useMutation({
    mutationFn: (q: string) =>
      askAIAssistant({
        data: {
          question: q,
          subjectId: selectedSubjectId === "all" ? undefined : selectedSubjectId,
          conversationId: activeConversationId || undefined,
        },
      }),
    onSuccess: (res) => {
      setActiveConversationId(res.conversationId);
      const newBotMsg: AIChatMessageDTO = {
        id: Date.now().toString(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newBotMsg]);
      queryClient.invalidateQueries({ queryKey: ["ai-chat-history"] });
      queryClient.invalidateQueries({ queryKey: ["student-progress"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to query AI Study Assistant");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || askMutation.isPending) return;

    const newUserMsg: AIChatMessageDTO = {
      id: Date.now().toString(),
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setQuestion("");
    askMutation.mutate(q);
  };

  const handleStartNew = () => {
    setActiveConversationId(null);
    setMessages([]);
    setQuestion("");
  };

  const subjects = subjectsQuery.data ?? [];
  const conversations = historyQuery.data ?? [];

  const getSourceIcon = (cat: AICitation["category"]) => {
    switch (cat) {
      case "Notes":
        return <FileText className="size-3.5 text-primary" />;
      case "Study Material":
        return <BookOpen className="size-3.5 text-purple-500" />;
      case "PYQ":
        return <FileQuestion className="size-3.5 text-amber-500" />;
      case "Digital Library":
        return <BookOpen className="size-3.5 text-blue-500" />;
      default:
        return <Sparkles className="size-3.5 text-cyan-500" />;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-12 min-h-[640px]">
      {/* Sidebar: Conversation History (MongoDB) */}
      <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card/60 backdrop-blur p-4 flex flex-col justify-between space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Saved Conversations</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1"
              onClick={handleStartNew}
            >
              <PlusCircle className="size-3" /> New
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Previous questions and answers stored securely in MongoDB with grounded citations.
          </p>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {historyQuery.isLoading ? (
              <div className="space-y-2 py-4">
                <div className="h-10 rounded bg-muted/40 animate-pulse" />
                <div className="h-10 rounded bg-muted/40 animate-pulse" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground">
                No past conversations yet. Ask your first academic question!
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConvMutation.mutate(c.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between group ${
                    activeConversationId === c.id
                      ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                      : "border-border/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="truncate font-medium text-foreground">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.updatedAt).toLocaleDateString()} · {c.messagesCount} msgs
                    </p>
                  </div>
                  <ChevronRight className="size-3 text-muted-foreground group-hover:text-primary shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Grounding Pipeline Card */}
        <div className="p-3 rounded-lg bg-secondary/40 border border-border/50 text-[11px] space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <GraduationCap className="size-3.5 text-primary" />
            MITS Grounding Pipeline
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Your questions are matched first against your Semester Syllabus Notes, Lab Manuals,
            PYQs, and Library Books before consulting general AI models.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="lg:col-span-8 flex flex-col justify-between rounded-xl border border-border/80 bg-card/60 backdrop-blur overflow-hidden">
        {/* Chat Header */}
        <div className="p-4 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-secondary/20">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Bot className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">MITS Study Assistant</h3>
              <p className="text-[11px] text-muted-foreground">
                Grounded on MITS Gwalior syllabus and engineering curriculum
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Context:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="h-8 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Subjects in Space</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[460px]">
          {messages.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Sparkles className="size-6" />
              </div>
              <h4 className="text-base font-semibold text-foreground">
                What would you like to study today?
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Ask about complex algorithms, OOP principles, past examination questions, or
                practical lab assignments. Every response cites specific notes and syllabus
                resources.
              </p>

              {/* Sample Prompts */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {[
                  "Explain dynamic polymorphism with a C++ code example",
                  "What is the time complexity of quicksort in the worst case?",
                  "Summarize Unit 1 OOPM key concepts for end-sem",
                  "What questions commonly appear in Mid-Sem exams for DSA?",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuestion(sample);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-secondary/80 hover:bg-secondary border border-border/50 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-3.5 space-y-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-secondary/60 border border-border/60 text-foreground"
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {msg.content}
                  </div>

                  {/* 17. Source Citations Badge Cards */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2 border-t border-border/50 space-y-1.5">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Verified Sources & Grounded Citations
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-card/80 border border-border/60 text-[10px] text-foreground font-medium"
                          >
                            {getSourceIcon(src.category)}
                            <span>{src.category}:</span>
                            <span className="font-semibold text-primary">{src.title}</span>
                            {src.chapterOrUnit && (
                              <span className="text-muted-foreground">({src.chapterOrUnit})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                    <User className="size-3.5" />
                  </div>
                )}
              </div>
            ))
          )}

          {askMutation.isPending && (
            <div className="flex gap-3 text-xs justify-start">
              <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Bot className="size-3.5 animate-pulse" />
              </div>
              <div className="bg-secondary/60 border border-border/60 rounded-xl p-3 flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                Searching syllabus notes, PYQs, and engineering literature...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border/70 bg-card flex items-center gap-2"
        >
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question grounded on your MITS syllabus..."
            className="text-xs h-10 border-border"
            disabled={askMutation.isPending}
          />
          <Button
            type="submit"
            disabled={!question.trim() || askMutation.isPending}
            className="h-10 px-4 bg-primary text-primary-foreground shrink-0"
          >
            {askMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
