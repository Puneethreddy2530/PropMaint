"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-elements";
import { Badge } from "@/components/ui/badge";
import { addComment } from "@/actions/tickets";
import { formatRelativeTime } from "@/lib/utils";
import { MessageSquare, Lock, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@prisma/client";

interface Comment {
    id: string;
    content: string;
    isInternal: boolean;
    createdAt: Date | string;
    author: { id: string; name: string; role: UserRole; avatarUrl: string | null };
}

interface Props {
    ticketId: string;
    comments: Comment[];
    canComment: boolean;
    canInternalNote: boolean;
    currentUserId: string;
}

export function CommentSection({ ticketId, comments, canComment, canInternalNote, currentUserId }: Props) {
    const [content, setContent] = useState("");
    const [isInternal, setIsInternal] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        if (!content.trim()) return;
        setLoading(true);
        const fd = new FormData();
        fd.set("ticketId", ticketId);
        fd.set("content", content);
        fd.set("isInternal", String(isInternal));
        const result = await addComment(fd);
        setLoading(false);
        if (result?.error) toast.error(result.error);
        else { setContent(""); toast.success(isInternal ? "Internal note added" : "Comment posted"); }
    }

    const roleColor = (role: UserRole) =>
        role === "TENANT" ? "text-amber-700" : role === "MANAGER" ? "text-teal-700" : "text-blue-700";

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm">Comments ({comments.length})</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Comment list */}
                {comments.length > 0 && (
                    <div className="space-y-3">
                        {comments.map(comment => (
                            <div key={comment.id}
                                className={`p-3 rounded-lg ${comment.isInternal ? "bg-slate-50 border border-slate-200" : comment.author.id === currentUserId ? "bg-primary/5 border border-primary/10" : "bg-muted/50"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold">
                                        {comment.author.name.split(" ").map(n => n[0]).join("")}
                                    </div>
                                    <span className={`text-xs font-semibold ${roleColor(comment.author.role)}`}>{comment.author.name}</span>
                                    <span className="text-[10px] text-muted-foreground capitalize">{comment.author.role.toLowerCase()}</span>
                                    {comment.isInternal && (
                                        <Badge variant="outline" className="text-[9px] gap-0.5 h-4"><Lock className="w-2.5 h-2.5" />Internal</Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground ml-auto">{formatRelativeTime(comment.createdAt)}</span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap pl-8">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add comment */}
                {canComment && (
                    <div className="space-y-2">
                        <Textarea placeholder={isInternal ? "Internal note (staff-only)..." : "Add a comment..."}
                            value={content} onChange={e => setContent(e.target.value)}
                            className={isInternal ? "border-slate-300 bg-slate-50/50" : ""} />
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {canInternalNote && (
                                    <Button variant={isInternal ? "secondary" : "ghost"} size="sm"
                                        onClick={() => setIsInternal(!isInternal)} className="text-xs gap-1">
                                        <Lock className="w-3 h-3" /> {isInternal ? "Internal Note" : "Switch to Internal"}
                                    </Button>
                                )}
                            </div>
                            <Button onClick={handleSubmit} disabled={!content.trim() || loading} size="sm" className="gap-1">
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                {isInternal ? "Add Note" : "Comment"}
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
