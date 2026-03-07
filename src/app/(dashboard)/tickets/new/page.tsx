import { auth } from "@/lib/auth";
import { getPropertiesForUser } from "@/actions/tickets";
import { redirect } from "next/navigation";
import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export default async function NewTicketPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");
    if (session.user.role === "STAFF") redirect("/dashboard");

    const properties = await getPropertiesForUser();
    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <a href="/tickets" className="text-sm text-muted-foreground hover:text-foreground">← Back to tickets</a>
                <h1 className="text-xl font-bold tracking-tight mt-2">New Maintenance Request</h1>
                <p className="text-sm text-muted-foreground mt-1">Describe the issue and we&apos;ll get it resolved</p>
            </div>
            <NewTicketForm properties={properties} />
        </div>
    );
}
