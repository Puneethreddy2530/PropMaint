import { getStaffMembers } from "@/actions/tickets";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_CONFIG } from "@/lib/permissions";
import { Users, Wrench, Mail, Phone } from "lucide-react";

export default async function TeamPage() {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") redirect("/dashboard");

  const staff = await getStaffMembers();

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Maintenance Team</h1>
        <p className="text-sm text-muted-foreground">{staff.length} technicians</p>
      </div>

      {staff.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Users className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No technicians yet</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {staff.map(member => (
            <Card key={member.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Wrench className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{member.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {member.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{member.email}</span>}
                    </div>
                    {member.phone && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5"><Phone className="w-3 h-3" />{member.phone}</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {member.specialties.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {CATEGORY_CONFIG[s as keyof typeof CATEGORY_CONFIG]?.emoji} {CATEGORY_CONFIG[s as keyof typeof CATEGORY_CONFIG]?.label}
                        </Badge>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs">
                        <span className="font-semibold text-foreground">{member._count.assignedTickets}</span>
                        <span className="text-muted-foreground"> active tickets</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
