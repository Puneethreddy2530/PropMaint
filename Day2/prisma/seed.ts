import { PrismaClient, TicketStatus, TicketPriority, TicketCategory, UserRole, ActivityAction, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.building.deleteMany();
  await prisma.property.deleteMany();

  const pw = await bcrypt.hash("demo123", 10);
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000);
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

  // Users
  const mgr = await prisma.user.create({ data: { email: "michael.chen@demo.com", name: "Michael Chen", passwordHash: pw, role: "MANAGER", phone: "+1 (555) 100-2000" }});
  const s1 = await prisma.user.create({ data: { email: "james.rodriguez@demo.com", name: "James Rodriguez", passwordHash: pw, role: "STAFF", phone: "+1 (555) 200-3000", specialties: ["PLUMBING", "HVAC"] }});
  const s2 = await prisma.user.create({ data: { email: "emily.wang@demo.com", name: "Emily Wang", passwordHash: pw, role: "STAFF", phone: "+1 (555) 200-4000", specialties: ["ELECTRICAL", "APPLIANCE"] }});
  const s3 = await prisma.user.create({ data: { email: "david.kim@demo.com", name: "David Kim", passwordHash: pw, role: "STAFF", phone: "+1 (555) 200-5000", specialties: ["STRUCTURAL", "GENERAL"] }});

  // Properties
  const p1 = await prisma.property.create({ data: { name: "Sunset Ridge Apartments", address: "450 Sunset Blvd", city: "Austin", state: "TX", zipCode: "73301", managerId: mgr.id }});
  const p2 = await prisma.property.create({ data: { name: "Oak Valley Condominiums", address: "1200 Oak Valley Dr", city: "Austin", state: "TX", zipCode: "73344", managerId: mgr.id }});
  const p3 = await prisma.property.create({ data: { name: "Riverside Townhomes", address: "88 River Walk Ln", city: "Austin", state: "TX", zipCode: "73301", managerId: mgr.id }});

  // Buildings
  const b1a = await prisma.building.create({ data: { name: "Building A", floors: 4, propertyId: p1.id }});
  const b1b = await prisma.building.create({ data: { name: "Building B", floors: 3, propertyId: p1.id }});
  const b2 = await prisma.building.create({ data: { name: "Main Tower", floors: 6, propertyId: p2.id }});
  const b3 = await prisma.building.create({ data: { name: "Row Houses", floors: 2, propertyId: p3.id }});

  // Units
  const u: Record<string, any> = {};
  for (const [num, bid, fl, bed, bath, sqft] of [
    ["A-101",b1a.id,1,1,1,650],["A-102",b1a.id,1,2,1,850],["A-201",b1a.id,2,2,2,950],["A-202",b1a.id,2,1,1,650],["A-301",b1a.id,3,3,2,1200],
    ["B-101",b1b.id,1,2,1,800],["B-201",b1b.id,2,2,2,900],["601",b2.id,6,2,2,1100],["301",b2.id,3,1,1,700],["TH-1",b3.id,1,3,2,1400],["TH-2",b3.id,1,3,2,1400],
  ] as [string,string,number,number,number,number][]) {
    u[num] = await prisma.unit.create({ data: { number: num, buildingId: bid, floor: fl, bedrooms: bed, bathrooms: bath, sqft } });
  }

  // Tenants
  const t1 = await prisma.user.create({ data: { email: "sarah.johnson@demo.com", name: "Sarah Johnson", passwordHash: pw, role: "TENANT", phone: "+1 (555) 300-1000", tenantUnitId: u["A-201"].id }});
  const t2 = await prisma.user.create({ data: { email: "alex.thompson@demo.com", name: "Alex Thompson", passwordHash: pw, role: "TENANT", phone: "+1 (555) 300-2000", tenantUnitId: u["601"].id }});
  const t3 = await prisma.user.create({ data: { email: "maria.garcia@demo.com", name: "Maria Garcia", passwordHash: pw, role: "TENANT", tenantUnitId: u["B-101"].id }});
  const t4 = await prisma.user.create({ data: { email: "robert.lee@demo.com", name: "Robert Lee", passwordHash: pw, role: "TENANT", tenantUnitId: u["TH-1"].id }});
  const t5 = await prisma.user.create({ data: { email: "priya.patel@demo.com", name: "Priya Patel", passwordHash: pw, role: "TENANT", tenantUnitId: u["A-301"].id }});

  // Tickets
  const tk1 = await prisma.ticket.create({ data: { title: "Strong gas smell in kitchen", description: "I can smell gas near the stove. Opened windows. Smell is strong and persistent.", status: "OPEN", priority: "EMERGENCY", category: "SAFETY", propertyId: p1.id, unitId: u["A-201"].id, createdById: t1.id, permissionToEnter: true, preferredTimes: "Available immediately", slaDeadline: new Date(Date.now() + 2*3600000), createdAt: hoursAgo(1) }});
  const tk2 = await prisma.ticket.create({ data: { title: "Kitchen faucet leaking badly", description: "Kitchen faucet dripping steadily. Water pooling under sink. Bucket fills every few hours.", status: "IN_PROGRESS", priority: "URGENT", category: "PLUMBING", propertyId: p2.id, unitId: u["601"].id, createdById: t2.id, assignedToId: s1.id, permissionToEnter: true, preferredTimes: "Weekdays 9am-5pm", estimatedCost: 150, slaDeadline: new Date(daysAgo(1).getTime()+24*3600000), acknowledgedAt: daysAgo(1), startedAt: hoursAgo(4), createdAt: daysAgo(2) }});
  const tk3 = await prisma.ticket.create({ data: { title: "AC unit not cooling properly", description: "Central AC not cooling. Set to 72°F but stays 80°F. Slight rattling noise.", status: "ASSIGNED", priority: "ROUTINE", category: "HVAC", propertyId: p1.id, unitId: u["B-101"].id, createdById: t3.id, assignedToId: s1.id, permissionToEnter: true, preferredTimes: "Mornings before 12pm", slaDeadline: new Date(daysAgo(1).getTime()+72*3600000), acknowledgedAt: daysAgo(1), createdAt: daysAgo(3) }});
  const tk4 = await prisma.ticket.create({ data: { title: "Garbage disposal not working", description: "Disposal hums but doesn't grind. Reset button didn't help. Sink drains slowly.", status: "COMPLETED", priority: "ROUTINE", category: "APPLIANCE", propertyId: p3.id, unitId: u["TH-1"].id, createdById: t4.id, assignedToId: s2.id, permissionToEnter: true, estimatedCost: 200, actualCost: 175, resolution: "Replaced disposal motor and cleared drain blockage. Working normally.", slaDeadline: new Date(daysAgo(3).getTime()+72*3600000), acknowledgedAt: daysAgo(4), startedAt: daysAgo(3), completedAt: daysAgo(1), createdAt: daysAgo(5) }});
  const tk5 = await prisma.ticket.create({ data: { title: "Hallway light flickering", description: "Ceiling light keeps flickering and buzzing for a week.", status: "CLOSED", priority: "ROUTINE", category: "ELECTRICAL", propertyId: p1.id, unitId: u["A-301"].id, createdById: t5.id, assignedToId: s2.id, estimatedCost: 80, actualCost: 65, resolution: "Replaced ballast and tube. No more flickering.", slaDeadline: new Date(daysAgo(8).getTime()+72*3600000), acknowledgedAt: daysAgo(9), startedAt: daysAgo(8), completedAt: daysAgo(7), verifiedAt: daysAgo(6), closedAt: daysAgo(6), createdAt: daysAgo(10) }});
  const tk6 = await prisma.ticket.create({ data: { title: "Dishwasher not draining", description: "Dishwasher fills but won't drain. Dishes sit in dirty water.", status: "ON_HOLD", priority: "ROUTINE", category: "APPLIANCE", propertyId: p2.id, unitId: u["301"].id, createdById: t2.id, assignedToId: s2.id, permissionToEnter: true, estimatedCost: 250, slaDeadline: new Date(daysAgo(2).getTime()+72*3600000), acknowledgedAt: daysAgo(3), startedAt: daysAgo(2), createdAt: daysAgo(4) }});
  const tk7 = await prisma.ticket.create({ data: { title: "Ant infestation in bathroom", description: "Large number of ants near sink and bathtub. Coming from crack in wall.", status: "OPEN", priority: "URGENT", category: "PEST_CONTROL", propertyId: p1.id, unitId: u["A-102"].id, createdById: t5.id, permissionToEnter: true, slaDeadline: new Date(Date.now()+24*3600000), createdAt: hoursAgo(6) }});
  const tk8 = await prisma.ticket.create({ data: { title: "Annual HVAC filter replacement", description: "Scheduled annual maintenance for Building A.", status: "ASSIGNED", priority: "SCHEDULED", category: "HVAC", propertyId: p1.id, unitId: u["A-101"].id, createdById: mgr.id, assignedToId: s1.id, permissionToEnter: true, slaDeadline: new Date(Date.now()+7*86400000), createdAt: daysAgo(2), acknowledgedAt: daysAgo(1) }});
  const tk9 = await prisma.ticket.create({ data: { title: "Ceiling water stain growing", description: "Brown water stain on ceiling expanding. Now about 2 feet across. Possible leak from above.", status: "ASSIGNED", priority: "URGENT", category: "PLUMBING", propertyId: p1.id, unitId: u["A-202"].id, createdById: t1.id, assignedToId: s3.id, permissionToEnter: true, slaDeadline: daysAgo(1), slaBroken: true, acknowledgedAt: daysAgo(2), createdAt: daysAgo(3) }});

  // Activity logs
  const acts = [
    { tid: tk1.id, uid: t1.id, a: "TICKET_CREATED" as const, d: "Sarah Johnson submitted an emergency safety request", at: hoursAgo(1) },
    { tid: tk2.id, uid: t2.id, a: "TICKET_CREATED" as const, d: "Alex Thompson submitted an urgent plumbing request", at: daysAgo(2) },
    { tid: tk2.id, uid: mgr.id, a: "ASSIGNED" as const, d: "Michael Chen assigned to James Rodriguez", at: daysAgo(1) },
    { tid: tk2.id, uid: s1.id, a: "STATUS_CHANGED" as const, d: "James Rodriguez started work", at: hoursAgo(4), pv: "ASSIGNED", nv: "IN_PROGRESS" },
    { tid: tk4.id, uid: t4.id, a: "TICKET_CREATED" as const, d: "Robert Lee submitted a maintenance request", at: daysAgo(5) },
    { tid: tk4.id, uid: mgr.id, a: "ASSIGNED" as const, d: "Michael Chen assigned to Emily Wang", at: daysAgo(4) },
    { tid: tk4.id, uid: s2.id, a: "STATUS_CHANGED" as const, d: "Emily Wang completed the repair", at: daysAgo(1), pv: "IN_PROGRESS", nv: "COMPLETED" },
    { tid: tk5.id, uid: t5.id, a: "TICKET_CREATED" as const, d: "Priya Patel submitted an electrical request", at: daysAgo(10) },
    { tid: tk5.id, uid: t5.id, a: "STATUS_CHANGED" as const, d: "Priya Patel verified the repair", at: daysAgo(6), pv: "COMPLETED", nv: "VERIFIED" },
    { tid: tk5.id, uid: mgr.id, a: "STATUS_CHANGED" as const, d: "Michael Chen closed ticket", at: daysAgo(6), pv: "VERIFIED", nv: "CLOSED" },
    { tid: tk6.id, uid: s2.id, a: "STATUS_CHANGED" as const, d: "Emily Wang put on hold — waiting for drain pump", at: daysAgo(1), pv: "IN_PROGRESS", nv: "ON_HOLD" },
    { tid: tk9.id, uid: t1.id, a: "TICKET_CREATED" as const, d: "Sarah Johnson submitted an urgent request", at: daysAgo(3) },
    { tid: tk9.id, uid: mgr.id, a: "SLA_BREACHED" as const, d: "SLA deadline exceeded", at: daysAgo(1) },
  ];
  for (const a of acts) {
    await prisma.activityLog.create({ data: { ticketId: a.tid, performedById: a.uid, action: a.a, description: a.d, previousValue: (a as any).pv || null, newValue: (a as any).nv || null, createdAt: a.at }});
  }

  // Comments
  await prisma.comment.create({ data: { ticketId: tk2.id, authorId: s1.id, content: "Inspected the faucet. Cartridge valve worn out. I have the part — should take 45 min.", createdAt: hoursAgo(3) }});
  await prisma.comment.create({ data: { ticketId: tk2.id, authorId: t2.id, content: "Thank you! Anything I should do in the meantime?", createdAt: hoursAgo(2) }});
  await prisma.comment.create({ data: { ticketId: tk2.id, authorId: s1.id, content: "Try tightening the shutoff valve under the sink clockwise.", createdAt: hoursAgo(1) }});
  await prisma.comment.create({ data: { ticketId: tk2.id, authorId: s1.id, content: "Note: Supply lines corroded. Recommend full replacement next cycle.", isInternal: true, createdAt: hoursAgo(1) }});
  await prisma.comment.create({ data: { ticketId: tk4.id, authorId: s2.id, content: "Motor seized. Ordering InSinkErator Badger 5 — arrives tomorrow.", createdAt: daysAgo(2) }});
  await prisma.comment.create({ data: { ticketId: tk6.id, authorId: s2.id, content: "Drain pump failed. Ordered Bosch part #00631200. ETA 3 business days.", createdAt: daysAgo(1) }});
  await prisma.comment.create({ data: { ticketId: tk6.id, authorId: mgr.id, content: "Emily, prioritize once part arrives. Check for other known issues.", isInternal: true, createdAt: hoursAgo(12) }});

  // Notifications
  const notifs = [
    { uid: mgr.id, tid: tk1.id, type: "TICKET_CREATED" as const, title: "🚨 Emergency", msg: "Gas smell reported in A-201", read: false, at: hoursAgo(1) },
    { uid: mgr.id, tid: tk7.id, type: "TICKET_CREATED" as const, title: "New Urgent", msg: "Ant infestation in A-102", read: false, at: hoursAgo(6) },
    { uid: mgr.id, tid: tk9.id, type: "SLA_WARNING" as const, title: "⚠️ SLA Breached", msg: "Water stain ticket past deadline", read: false, at: daysAgo(1) },
    { uid: t2.id, tid: tk2.id, type: "STATUS_UPDATE" as const, title: "In Progress", msg: "Faucet repair started", read: true, at: hoursAgo(4) },
    { uid: t2.id, tid: tk2.id, type: "COMMENT_ADDED" as const, title: "New Comment", msg: "James commented on your request", read: false, at: hoursAgo(3) },
    { uid: t4.id, tid: tk4.id, type: "STATUS_UPDATE" as const, title: "Completed", msg: "Disposal repaired — please verify", read: false, at: daysAgo(1) },
    { uid: s1.id, tid: tk3.id, type: "TICKET_ASSIGNED" as const, title: "New Assignment", msg: "AC repair in B-101", read: true, at: daysAgo(1) },
    { uid: s1.id, tid: tk8.id, type: "TICKET_ASSIGNED" as const, title: "Scheduled", msg: "HVAC filter replacement assigned", read: false, at: daysAgo(1) },
    { uid: s3.id, tid: tk9.id, type: "SLA_WARNING" as const, title: "⚠️ SLA Breached", msg: "Your ticket exceeded deadline", read: false, at: daysAgo(1) },
  ];
  for (const n of notifs) {
    await prisma.notification.create({ data: { userId: n.uid, ticketId: n.tid, type: n.type, title: n.title, message: n.msg, read: n.read, link: `/tickets/${n.tid}`, createdAt: n.at }});
  }

  console.log("\n✅ Seeded successfully!");
  console.log("┌─────────────┬──────────────────────────┬──────────┐");
  console.log("│ Role        │ Email                    │ Password │");
  console.log("├─────────────┼──────────────────────────┼──────────┤");
  console.log("│ 🏠 Tenant   │ sarah.johnson@demo.com   │ demo123  │");
  console.log("│ 👔 Manager  │ michael.chen@demo.com    │ demo123  │");
  console.log("│ 🔧 Staff    │ james.rodriguez@demo.com │ demo123  │");
  console.log("└─────────────┴──────────────────────────┴──────────┘");
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
