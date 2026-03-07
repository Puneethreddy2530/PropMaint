import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default async function ProfilePage() {
    const session = await auth();
    const user = session?.user;

    return (
        <div className="flex flex-col gap-4 max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input value={user?.name || ""} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={user?.email || ""} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={user?.role || ""} disabled />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
