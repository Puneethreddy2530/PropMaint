import { auth } from "@/lib/auth";
import { getStaffMembers } from "@/actions/tickets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Wrench } from "lucide-react";

function UserAvatar({ src, name }: { src?: string | null; name: string }) {
    if (!src) {
        return (
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {name?.split(" ").map(n => n[0]).join("")}
            </div>
        );
    }
    return <img src={src} alt={name} className="w-10 h-10 rounded-full object-cover" />;
}

export default async function TeamPage() {
    const session = await auth();
    if (session?.user?.role !== "MANAGER") {
        return (
            <div className="text-muted-foreground text-sm">
                Contact your property manager for team information.
            </div>
        );
    }

    const staff = await getStaffMembers();

    return (
        <div className="space-y-4 max-w-4xl">
            <div>
                <h1 className="text-xl font-bold tracking-tight">Team</h1>
                <p className="text-sm text-muted-foreground">{staff.length} technician{staff.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {staff.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3">
                                <UserAvatar src={member.avatarUrl} name={member.name} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member._count.assignedTickets} active ticket{member._count.assignedTickets !== 1 ? "s" : ""}</p>
                                </div>
                            </div>

                            {member.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {member.specialties.map((s) => (
                                        <Badge key={s} variant="outline" className="text-[10px] gap-1">
                                            <Wrench className="w-2.5 h-2.5" />
                                            {s.replace("_", " ")}
                                        </Badge>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-1">
                                {member.email && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Mail className="w-3 h-3" /> {member.email}
                                    </p>
                                )}
                                {member.phone && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                        <Phone className="w-3 h-3" /> {member.phone}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
