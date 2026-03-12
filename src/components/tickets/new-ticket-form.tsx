"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Textarea, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/form-elements";
import { createTicket } from "@/actions/tickets";
import { CATEGORY_CONFIG } from "@/lib/permissions";
import { AlertTriangle, Loader2, ChevronRight, ChevronLeft, CheckCircle2, Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { useAITriage } from "@/lib/useAITriage";

interface Property {
    id: string; name: string;
    buildings: { id: string; name: string; units: { id: string; number: string }[] }[];
}

const EMERGENCY_KEYWORDS = ["fire", "flood", "gas leak", "gas smell", "smoke", "carbon monoxide", "electrical fire", "water main", "sewage", "collapse"];

export function NewTicketForm({ properties }: { properties: Property[] }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Form state
    const [propertyId, setPropertyId] = useState("");
    const [unitId, setUnitId] = useState("");
    const [category, setCategory] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState("ROUTINE");
    const [permissionToEnter, setPermissionToEnter] = useState(false);
    const [preferredTimes, setPreferredTimes] = useState("");

    const { isListening, transcript, toggleListening, clearTranscript, hasSupport } = useSpeechRecognition();

    useEffect(() => {
        if (transcript) {
            setDescription(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + transcript);
            clearTranscript();
        }
    }, [transcript, clearTranscript]);

    const { analyzeIssue, result, isProcessing } = useAITriage();

    useEffect(() => {
        if (result && result.labels && result.labels.length > 0) {
            // Find a matching category in CATEGORY_CONFIG based on the AI label
            const topLabel = result.labels[0].toUpperCase();

            // Map AI label to our enums if needed
            let matchedCategory = "";
            if (topLabel.includes("PLUMB") || topLabel.includes("LEAK")) matchedCategory = "PLUMBING";
            else if (topLabel.includes("ELECT")) matchedCategory = "ELECTRICAL";
            else if (topLabel.includes("APPLI")) matchedCategory = "APPLIANCE";
            else if (topLabel.includes("STRUCT")) matchedCategory = "STRUCTURAL";
            else if (topLabel.includes("SECUR") || topLabel.includes("FIRE")) matchedCategory = "SAFETY";
            else matchedCategory = "GENERAL";

            if (Object.keys(CATEGORY_CONFIG).includes(matchedCategory)) {
                setCategory(matchedCategory);
            }
        }
    }, [result]);

    // Derived state
    const selectedProperty = properties.find(p => p.id === propertyId);
    const allUnits = selectedProperty?.buildings.flatMap(b => b.units.map(u => ({ ...u, buildingName: b.name }))) || [];

    // Emergency detection
    const isEmergency = EMERGENCY_KEYWORDS.some(kw =>
        title.toLowerCase().includes(kw) || description.toLowerCase().includes(kw)
    );

    const totalSteps = 4;

    async function handleSubmit() {
        setLoading(true);
        setError("");
        const fd = new FormData();
        fd.set("title", title);
        fd.set("description", description);
        fd.set("category", category);
        fd.set("priority", isEmergency ? "EMERGENCY" : priority);
        fd.set("propertyId", propertyId);
        fd.set("unitId", unitId);
        fd.set("permissionToEnter", String(permissionToEnter));
        fd.set("preferredTimes", preferredTimes);

        const result = await createTicket(fd);
        setLoading(false);
        if (result && "error" in result) { setError(result.message); toast.error(result.message); }
    }

    const canNext = step === 1 ? propertyId && unitId
        : step === 2 ? category
            : step === 3 ? title.length >= 5 && description.length >= 10
                : true;

    return (
        <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-2">
                {[1, 2, 3, 4].map(s => (
                    <div key={s} className="flex items-center gap-2 flex-1">
                        <div className={`w-full h-1.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`} />
                    </div>
                ))}
            </div>
            <p className="text-xs text-muted-foreground">Step {step} of {totalSteps}: {
                step === 1 ? "Location" : step === 2 ? "Category" : step === 3 ? "Details" : "Review & Submit"
            }</p>

            {/* Emergency Alert */}
            {isEmergency && step >= 3 && (
                <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4">
                        <div className="flex gap-3">
                            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-red-900">Emergency Detected</p>
                                <p className="text-xs text-red-700 mt-1">If there is immediate danger, call 911 first. For gas leaks, evacuate and call your gas company. This request will be flagged as an emergency with a 2-hour SLA.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent className="p-6">
                    {/* Step 1: Location */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Property</Label>
                                <Select value={propertyId} onValueChange={v => { setPropertyId(v); setUnitId(""); }}>
                                    <SelectTrigger data-testid="ticket-property-select"><SelectValue placeholder="Select property..." /></SelectTrigger>
                                    <SelectContent>
                                        {properties.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            {propertyId && (
                                <div className="space-y-2">
                                    <Label>Unit</Label>
                                    <Select value={unitId} onValueChange={setUnitId}>
                                        <SelectTrigger data-testid="ticket-unit-select"><SelectValue placeholder="Select unit..." /></SelectTrigger>
                                        <SelectContent>
                                            {allUnits.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.buildingName} — Unit {u.number}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Category */}
                    {step === 2 && (
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                <button key={key} onClick={() => setCategory(key)} data-testid={`ticket-category-${key}`}
                                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${category === key ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30"
                                        }`}>
                                    <span className="text-2xl">{cfg.emoji}</span>
                                    <span className="text-sm font-medium">{cfg.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Step 3: Details */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input data-testid="ticket-title-input" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="Brief description, e.g. 'Leaking kitchen faucet'" maxLength={200} />
                                <p className="text-xs text-muted-foreground">{title.length}/200</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <div className="relative">
                                    <Textarea data-testid="ticket-description-input" value={description} onChange={e => setDescription(e.target.value)}
                                        placeholder="Describe the issue in detail. When did it start? How severe is it? What have you tried?" rows={4} maxLength={2000} />
                                    {hasSupport && (
                                        <button
                                            type="button"
                                            onClick={toggleListening}
                                            className={`absolute right-2 bottom-2 p-2 rounded-full transition-colors ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                                }`}
                                        >
                                            {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">{description.length}/2000</p>
                                    <button
                                        type="button"
                                        onClick={() => analyzeIssue(description)}
                                        disabled={isProcessing || description.length < 10}
                                        className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
                                        {isProcessing ? 'AI is analyzing...' : 'AI Auto-Categorize'}
                                    </button>
                                </div>
                                {result?.labels?.length && result.scores?.length ? (
                                    <div className="mt-2 p-3 bg-green-50 text-green-800 text-sm rounded-md border border-green-200">
                                        <strong>AI Suggestion:</strong> Looks like a <b>{result.labels[0]}</b> issue.
                                        Confidence: {Math.round((result.scores[0] || 0) * 100)}%
                                    </div>
                                ) : null}
                            </div>
                            {!isEmergency && (
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select value={priority} onValueChange={setPriority}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ROUTINE">🔵 Routine (72h SLA)</SelectItem>
                                            <SelectItem value="URGENT">🟡 Urgent (24h SLA)</SelectItem>
                                            <SelectItem value="EMERGENCY">🔴 Emergency (2h SLA)</SelectItem>
                                            <SelectItem value="SCHEDULED">🟣 Scheduled (7d SLA)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Review */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-sm">Review Your Request</h3>
                            <div className="space-y-3 text-sm">
                                <ReviewRow label="Property" value={selectedProperty?.name || ""} />
                                <ReviewRow label="Unit" value={allUnits.find(u => u.id === unitId)?.number || ""} />
                                <ReviewRow label="Category" value={`${CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.emoji} ${CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label}`} />
                                <ReviewRow label="Priority" value={isEmergency ? "🔴 Emergency (auto-detected)" : priority} />
                                <ReviewRow label="Title" value={title} />
                                <ReviewRow label="Description" value={description} />
                            </div>

                            <div className="space-y-3 pt-2 border-t">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="pte" data-testid="ticket-permission" checked={permissionToEnter} onChange={e => setPermissionToEnter(e.target.checked)}
                                        className="w-4 h-4 rounded border-input" />
                                    <Label htmlFor="pte" className="text-sm font-normal">Permission to enter unit when I&apos;m not home</Label>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Preferred Times (optional)</Label>
                                    <Input value={preferredTimes} onChange={e => setPreferredTimes(e.target.value)}
                                        placeholder="e.g. Weekdays 9am-5pm" />
                                </div>
                            </div>

                            {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
                {step > 1 ? (
                    <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
                        <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                ) : <div />}

                {step < totalSteps ? (
                    <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1" data-testid="ticket-next-step">
                        Next <ChevronRight className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button onClick={handleSubmit} disabled={loading} className="gap-1" data-testid="ticket-submit">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Submit Request
                    </Button>
                )}
            </div>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    );
}

