import { PrismaClient, TicketStatus, TicketPriority, TicketCategory, UserRole, ActivityAction, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.building.deleteMany();
  await prisma.property.deleteMany();

  console.log("✅ Cleaned existing data");

  const password = await bcrypt.hash("demo123", 10);

  // ========================================================================
  // USERS
  // ========================================================================

  const manager = await prisma.user.create({
    data: {
      email: "michael.chen@demo.com",
      name: "Michael Chen",
      passwordHash: password,
      role: UserRole.MANAGER,
      phone: "+1 (555) 100-2000",
      avatarUrl: null,
    },
  });

  const manager2 = await prisma.user.create({
    data: {
      email: "olivia.davis@demo.com",
      name: "Olivia Davis",
      passwordHash: password,
      role: UserRole.MANAGER,
      phone: "+1 (555) 100-3000",
      avatarUrl: null,
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      email: "james.rodriguez@demo.com",
      name: "James Rodriguez",
      passwordHash: password,
      role: UserRole.STAFF,
      phone: "+1 (555) 200-3000",
      specialties: [TicketCategory.PLUMBING, TicketCategory.HVAC],
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: "emily.wang@demo.com",
      name: "Emily Wang",
      passwordHash: password,
      role: UserRole.STAFF,
      phone: "+1 (555) 200-4000",
      specialties: [TicketCategory.ELECTRICAL, TicketCategory.APPLIANCE],
    },
  });

  const staff3 = await prisma.user.create({
    data: {
      email: "david.kim@demo.com",
      name: "David Kim",
      passwordHash: password,
      role: UserRole.STAFF,
      phone: "+1 (555) 200-5000",
      specialties: [TicketCategory.STRUCTURAL, TicketCategory.GENERAL],
    },
  });

  const staff4 = await prisma.user.create({
    data: {
      email: "sofia.patel@demo.com",
      name: "Sofia Patel",
      passwordHash: password,
      role: UserRole.STAFF,
      phone: "+1 (555) 200-6000",
      specialties: [TicketCategory.ELECTRICAL, TicketCategory.SAFETY],
    },
  });

  const staff5 = await prisma.user.create({
    data: {
      email: "liam.brown@demo.com",
      name: "Liam Brown",
      passwordHash: password,
      role: UserRole.STAFF,
      phone: "+1 (555) 200-7000",
      specialties: [TicketCategory.APPLIANCE, TicketCategory.PEST_CONTROL],
    },
  });

  console.log("✅ Created users (2 managers, 5 staff)");

  // ========================================================================
  // PROPERTIES
  // ========================================================================

  const property1 = await prisma.property.create({
    data: {
      name: "Sunset Ridge Apartments",
      address: "450 Sunset Boulevard",
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      managerId: manager.id,
    },
  });

  const property2 = await prisma.property.create({
    data: {
      name: "Oak Valley Condominiums",
      address: "1200 Oak Valley Drive",
      city: "Austin",
      state: "TX",
      zipCode: "73344",
      managerId: manager.id,
    },
  });

  const property3 = await prisma.property.create({
    data: {
      name: "Riverside Townhomes",
      address: "88 River Walk Lane",
      city: "Austin",
      state: "TX",
      zipCode: "73301",
      managerId: manager2.id,
    },
  });

  console.log("✅ Created 3 properties");

  // ========================================================================
  // BUILDINGS & UNITS
  // ========================================================================

  const building1A = await prisma.building.create({
    data: {
      name: "Building A",
      floors: 4,
      propertyId: property1.id,
    },
  });

  const building1B = await prisma.building.create({
    data: {
      name: "Building B",
      floors: 3,
      propertyId: property1.id,
    },
  });

  const building2 = await prisma.building.create({
    data: {
      name: "Main Tower",
      floors: 6,
      propertyId: property2.id,
    },
  });

  const building3 = await prisma.building.create({
    data: {
      name: "Row Houses",
      floors: 2,
      propertyId: property3.id,
    },
  });

  // Create units
  const unitData = [
    { number: "A-101", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 650, buildingId: building1A.id },
    { number: "A-102", floor: 1, bedrooms: 2, bathrooms: 1, sqft: 850, buildingId: building1A.id },
    { number: "A-201", floor: 2, bedrooms: 2, bathrooms: 2, sqft: 950, buildingId: building1A.id },
    { number: "A-202", floor: 2, bedrooms: 1, bathrooms: 1, sqft: 650, buildingId: building1A.id },
    { number: "A-301", floor: 3, bedrooms: 3, bathrooms: 2, sqft: 1200, buildingId: building1A.id },
    { number: "B-101", floor: 1, bedrooms: 2, bathrooms: 1, sqft: 800, buildingId: building1B.id },
    { number: "B-201", floor: 2, bedrooms: 2, bathrooms: 2, sqft: 900, buildingId: building1B.id },
    { number: "601", floor: 6, bedrooms: 2, bathrooms: 2, sqft: 1100, buildingId: building2.id },
    { number: "301", floor: 3, bedrooms: 1, bathrooms: 1, sqft: 700, buildingId: building2.id },
    { number: "TH-1", floor: 1, bedrooms: 3, bathrooms: 2, sqft: 1400, buildingId: building3.id },
    { number: "TH-2", floor: 1, bedrooms: 3, bathrooms: 2, sqft: 1400, buildingId: building3.id },
  ];

  const units: Record<string, { id: string }> = {};
  for (const u of unitData) {
    const unit = await prisma.unit.create({ data: u });
    units[u.number] = unit;
  }

  console.log("✅ Created 4 buildings, 11 units");

  // ========================================================================
  // TENANTS (assigned to units)
  // ========================================================================

  const tenant1 = await prisma.user.create({
    data: {
      email: "sarah.johnson@demo.com",
      name: "Sarah Johnson",
      passwordHash: password,
      role: UserRole.TENANT,
      phone: "+1 (555) 300-1000",
      tenantUnitId: units["A-201"].id,
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      email: "alex.thompson@demo.com",
      name: "Alex Thompson",
      passwordHash: password,
      role: UserRole.TENANT,
      phone: "+1 (555) 300-2000",
      tenantUnitId: units["601"].id,
    },
  });

  const tenant3 = await prisma.user.create({
    data: {
      email: "maria.garcia@demo.com",
      name: "Maria Garcia",
      passwordHash: password,
      role: UserRole.TENANT,
      phone: "+1 (555) 300-3000",
      tenantUnitId: units["TH-1"].id,
    },
  });

  console.log("✅ Created 3 tenants");

  // ========================================================================
  // TICKETS — Realistic scenarios across all statuses
  // ========================================================================

  const now = new Date();
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Ticket 1: EMERGENCY - Active gas smell (SLA breached)
  const ticket1 = await prisma.ticket.create({
    data: {
      title: "Strong gas smell in kitchen",
      description: "I can smell gas near the stove area. It started about 30 minutes ago. I've turned off the stove and opened windows. No visible gas leak but the smell is strong and persistent.",
      status: TicketStatus.OPEN,
      priority: TicketPriority.EMERGENCY,
      category: TicketCategory.SAFETY,
      propertyId: property1.id,
      unitId: units["A-201"].id,
      createdById: tenant1.id,
      permissionToEnter: true,
      preferredTimes: "Available immediately - this is urgent",
      slaDeadline: hoursAgo(1),
      slaBroken: true,
      createdAt: hoursAgo(5),
    },
  });

  // Ticket 2: URGENT — Leaking pipe (assigned, in progress)
  const ticket2 = await prisma.ticket.create({
    data: {
      title: "Kitchen faucet leaking badly",
      description: "The kitchen faucet has been dripping steadily for the past day and now it's gotten much worse. Water is pooling under the sink cabinet. I've placed a bucket but it fills up every few hours.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.URGENT,
      category: TicketCategory.PLUMBING,
      propertyId: property2.id,
      unitId: units["601"].id,
      createdById: tenant2.id,
      assignedToId: staff1.id,
      permissionToEnter: true,
      preferredTimes: "Weekdays 9am-5pm",
      estimatedCost: 150,
      slaDeadline: new Date(daysAgo(1).getTime() + 24 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(1),
      startedAt: hoursAgo(4),
      createdAt: daysAgo(2),
    },
  });

  // Ticket 3: ROUTINE — AC not cooling (assigned)
  const ticket3 = await prisma.ticket.create({
    data: {
      title: "AC unit not cooling properly",
      description: "The central AC in the master bedroom isn't cooling effectively. Set to 72°F but room stays around 80°F. Filter was replaced last month. Unit is making a slight rattling noise.",
      status: TicketStatus.ASSIGNED,
      priority: TicketPriority.ROUTINE,
      category: TicketCategory.HVAC,
      propertyId: property3.id,
      unitId: units["TH-1"].id,
      createdById: tenant3.id,
      assignedToId: staff1.id,
      permissionToEnter: true,
      preferredTimes: "Mornings before 12pm",
      slaDeadline: new Date(daysAgo(1).getTime() + 72 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(1),
      createdAt: daysAgo(3),
    },
  });

  // Ticket 4: COMPLETED — Broken garbage disposal (needs verification)
  const ticket4 = await prisma.ticket.create({
    data: {
      title: "Garbage disposal not working",
      description: "Garbage disposal makes a humming sound but doesn't actually grind. Tried the reset button underneath with no luck. Kitchen sink drains very slowly now too.",
      status: TicketStatus.COMPLETED,
      priority: TicketPriority.ROUTINE,
      category: TicketCategory.APPLIANCE,
      propertyId: property3.id,
      unitId: units["TH-2"].id,
      createdById: tenant3.id,
      assignedToId: staff2.id,
      permissionToEnter: true,
      estimatedCost: 200,
      actualCost: 175,
      resolution: "Replaced the garbage disposal motor and cleared the drain pipe blockage. Tested operation — working normally now. Recommended tenant avoid putting fibrous foods (celery, corn husks) in the disposal.",
      slaDeadline: new Date(daysAgo(3).getTime() + 72 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(4),
      startedAt: daysAgo(3),
      completedAt: daysAgo(1),
      createdAt: daysAgo(5),
    },
  });

  // Ticket 5: CLOSED — Light fixture replacement
  const ticket5 = await prisma.ticket.create({
    data: {
      title: "Hallway light fixture flickering",
      description: "The hallway ceiling light keeps flickering on and off. It's been doing this for about a week. Sometimes it buzzes too.",
      status: TicketStatus.CLOSED,
      priority: TicketPriority.ROUTINE,
      category: TicketCategory.ELECTRICAL,
      propertyId: property1.id,
      unitId: units["A-301"].id,
      createdById: tenant1.id,
      assignedToId: staff2.id,
      permissionToEnter: false,
      estimatedCost: 80,
      actualCost: 65,
      resolution: "Replaced the ballast and fluorescent tube. Fixture is now working properly with no flickering.",
      slaDeadline: new Date(daysAgo(8).getTime() + 72 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(9),
      startedAt: daysAgo(8),
      completedAt: daysAgo(7),
      verifiedAt: daysAgo(6),
      closedAt: daysAgo(6),
      createdAt: daysAgo(10),
    },
  });

  // Ticket 6: ON_HOLD — Waiting for parts
  const ticket6 = await prisma.ticket.create({
    data: {
      title: "Dishwasher not draining",
      description: "Dishwasher fills with water but won't drain at the end of the cycle. Dishes come out sitting in dirty water. Model is Bosch SHE3AR75UC.",
      status: TicketStatus.ON_HOLD,
      priority: TicketPriority.ROUTINE,
      category: TicketCategory.APPLIANCE,
      propertyId: property2.id,
      unitId: units["301"].id,
      createdById: tenant2.id,
      assignedToId: staff2.id,
      permissionToEnter: true,
      preferredTimes: "Any weekday afternoon",
      estimatedCost: 250,
      slaDeadline: new Date(daysAgo(2).getTime() + 72 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(3),
      startedAt: daysAgo(2),
      createdAt: daysAgo(4),
    },
  });

  // Ticket 7: OPEN — Pest issue (new)
  const ticket7 = await prisma.ticket.create({
    data: {
      title: "Ant infestation in bathroom",
      description: "Large number of ants appearing in the bathroom, especially near the sink and bathtub. They seem to be coming from a crack in the wall near the baseboard. Getting worse each day.",
      status: TicketStatus.OPEN,
      priority: TicketPriority.URGENT,
      category: TicketCategory.PEST_CONTROL,
      propertyId: property1.id,
      unitId: units["A-102"].id,
      createdById: tenant1.id,
      permissionToEnter: true,
      preferredTimes: "Weekdays, anytime",
      slaDeadline: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      createdAt: hoursAgo(6),
    },
  });

  // Ticket 8: SCHEDULED maintenance
  const ticket8 = await prisma.ticket.create({
    data: {
      title: "Annual HVAC filter replacement",
      description: "Scheduled annual maintenance - HVAC filter replacement and system inspection for all units in Building A.",
      status: TicketStatus.ASSIGNED,
      priority: TicketPriority.SCHEDULED,
      category: TicketCategory.HVAC,
      propertyId: property1.id,
      unitId: units["A-101"].id,
      createdById: manager.id,
      assignedToId: staff1.id,
      permissionToEnter: true,
      slaDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      createdAt: daysAgo(2),
      acknowledgedAt: daysAgo(1),
    },
  });

  // Ticket 9: SLA BREACHED ticket
  const ticket9 = await prisma.ticket.create({
    data: {
      title: "Ceiling water stain growing",
      description: "There's a brown water stain on the living room ceiling that's been slowly expanding. Started small about a week ago but now covers about 2 feet across. Might be a leak from the unit above.",
      status: TicketStatus.ASSIGNED,
      priority: TicketPriority.URGENT,
      category: TicketCategory.PLUMBING,
      propertyId: property1.id,
      unitId: units["A-202"].id,
      createdById: tenant1.id,
      assignedToId: staff3.id,
      permissionToEnter: true,
      slaDeadline: daysAgo(1), // SLA already passed!
      slaBroken: true,
      acknowledgedAt: daysAgo(2),
      createdAt: daysAgo(3),
    },
  });

  // Ticket 10: IN_PROGRESS — Window latch broken
  const ticket10 = await prisma.ticket.create({
    data: {
      title: "Bedroom window won't latch",
      description: "The bedroom window no longer latches shut. It feels loose and won't lock, which is a security concern. The frame might be warped.",
      status: TicketStatus.IN_PROGRESS,
      priority: TicketPriority.ROUTINE,
      category: TicketCategory.STRUCTURAL,
      propertyId: property2.id,
      unitId: units["301"].id,
      createdById: tenant2.id,
      assignedToId: staff4.id,
      permissionToEnter: true,
      preferredTimes: "Weekdays after 4pm",
      slaDeadline: new Date(daysAgo(1).getTime() + 72 * 60 * 60 * 1000),
      acknowledgedAt: daysAgo(1),
      startedAt: hoursAgo(6),
      createdAt: daysAgo(2),
    },
  });

  console.log("✅ Created 10 tickets across all statuses");

  // ========================================================================
  // ACTIVITY LOGS — Realistic timelines
  // ========================================================================

  // Activities for ticket 2 (the leaking faucet — full lifecycle)
  const t2Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Alex Thompson submitted a new urgent plumbing request", at: daysAgo(2), by: tenant2.id },
    { action: ActivityAction.ASSIGNED, desc: "Michael Chen assigned this ticket to James Rodriguez", at: daysAgo(1), by: manager.id, meta: { assigneeName: "James Rodriguez" } },
    { action: ActivityAction.STATUS_CHANGED, desc: "James Rodriguez changed status from Assigned to In Progress", at: hoursAgo(4), by: staff1.id, prev: "ASSIGNED", next: "IN_PROGRESS" },
    { action: ActivityAction.COST_UPDATED, desc: "James Rodriguez estimated repair cost at $150", at: hoursAgo(3), by: staff1.id, next: "150" },
  ];

  for (const act of t2Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket2.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        previousValue: act.prev || null,
        newValue: act.next || null,
        metadata: act.meta ?? undefined,
        createdAt: act.at,
      },
    });
  }

  // Activities for ticket 4 (completed garbage disposal)
  const t4Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Maria Garcia submitted a new routine appliance request", at: daysAgo(5), by: tenant3.id },
    { action: ActivityAction.ASSIGNED, desc: "Olivia Davis assigned this ticket to Emily Wang", at: daysAgo(4), by: manager2.id },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang changed status from Assigned to In Progress", at: daysAgo(3), by: staff2.id, prev: "ASSIGNED", next: "IN_PROGRESS" },
    { action: ActivityAction.COMMENT_ADDED, desc: "Emily Wang added a comment", at: daysAgo(2), by: staff2.id },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang changed status from In Progress to Completed", at: daysAgo(1), by: staff2.id, prev: "IN_PROGRESS", next: "COMPLETED" },
  ];

  for (const act of t4Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket4.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        previousValue: act.prev || null,
        newValue: act.next || null,
        createdAt: act.at,
      },
    });
  }

  // Activities for ticket 5 (closed light fixture)
  const t5Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Sarah Johnson submitted a new routine electrical request", at: daysAgo(10), by: tenant1.id },
    { action: ActivityAction.ASSIGNED, desc: "Michael Chen assigned this ticket to Emily Wang", at: daysAgo(9), by: manager.id },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang changed status to In Progress", at: daysAgo(8), by: staff2.id, prev: "ASSIGNED", next: "IN_PROGRESS" },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang marked as Completed", at: daysAgo(7), by: staff2.id, prev: "IN_PROGRESS", next: "COMPLETED" },
    { action: ActivityAction.STATUS_CHANGED, desc: "Sarah Johnson verified the repair", at: daysAgo(6), by: tenant1.id, prev: "COMPLETED", next: "VERIFIED" },
    { action: ActivityAction.STATUS_CHANGED, desc: "Michael Chen closed this ticket", at: daysAgo(6), by: manager.id, prev: "VERIFIED", next: "CLOSED" },
  ];

  for (const act of t5Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket5.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        previousValue: act.prev || null,
        newValue: act.next || null,
        createdAt: act.at,
      },
    });
  }

  // Activities for ticket 1 (emergency gas smell - SLA breached)
  const t1Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Sarah Johnson submitted an emergency safety request", at: hoursAgo(5), by: tenant1.id },
    { action: ActivityAction.SLA_BREACHED, desc: "SLA deadline exceeded - emergency ticket still open", at: hoursAgo(1), by: manager.id },
  ];

  for (const act of t1Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket1.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        createdAt: act.at,
      },
    });
  }

  // Activities for ticket 10 (window latch)
  await prisma.activityLog.create({
    data: {
      ticketId: ticket10.id,
      performedById: tenant2.id,
      action: ActivityAction.TICKET_CREATED,
      description: "Alex Thompson submitted a routine structural request",
      createdAt: daysAgo(2),
    },
  });

  // Activities for ticket 6 (on hold dishwasher)
  const t6Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Alex Thompson submitted a maintenance request", at: daysAgo(4), by: tenant2.id },
    { action: ActivityAction.ASSIGNED, desc: "Michael Chen assigned to Emily Wang", at: daysAgo(3), by: manager.id },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang started work", at: daysAgo(2), by: staff2.id, prev: "ASSIGNED", next: "IN_PROGRESS" },
    { action: ActivityAction.STATUS_CHANGED, desc: "Emily Wang put on hold — waiting for replacement drain pump (ETA 3 days)", at: daysAgo(1), by: staff2.id, prev: "IN_PROGRESS", next: "ON_HOLD" },
  ];

  for (const act of t6Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket6.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        previousValue: act.prev || null,
        newValue: act.next || null,
        createdAt: act.at,
      },
    });
  }

  // Activities for SLA breached ticket 9
  const t9Activities = [
    { action: ActivityAction.TICKET_CREATED, desc: "Sarah Johnson submitted an urgent plumbing request", at: daysAgo(3), by: tenant1.id },
    { action: ActivityAction.ASSIGNED, desc: "Michael Chen assigned to David Kim", at: daysAgo(2), by: manager.id },
    { action: ActivityAction.SLA_BREACHED, desc: "SLA deadline exceeded — ticket still not resolved", at: daysAgo(1), by: manager.id },
  ];

  for (const act of t9Activities) {
    await prisma.activityLog.create({
      data: {
        ticketId: ticket9.id,
        performedById: act.by,
        action: act.action,
        description: act.desc,
        createdAt: act.at,
      },
    });
  }

  console.log("✅ Created activity logs for all tickets");

  // ========================================================================
  // COMMENTS — Realistic maintenance communication
  // ========================================================================

  // Comments on ticket 2 (leaking faucet)
  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: staff1.id,
      content: "I've inspected the faucet. The cartridge valve is worn out and needs replacement. I have the part in my van — should take about 45 minutes to fix. I'll also check the supply lines while I'm under there.",
      isInternal: false,
      createdAt: hoursAgo(3),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: tenant2.id,
      content: "Thank you! Is there anything I should do in the meantime? The bucket is almost full again.",
      isInternal: false,
      createdAt: hoursAgo(2),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: staff1.id,
      content: "Try tightening the shutoff valve under the sink clockwise — that should slow the drip until I finish the repair.",
      isInternal: false,
      createdAt: hoursAgo(1),
    },
  });

  // Internal note on ticket 2
  await prisma.comment.create({
    data: {
      ticketId: ticket2.id,
      authorId: staff1.id,
      content: "Note: Supply lines are corroded. Recommend full replacement in next scheduled maintenance cycle. Added to building maintenance plan.",
      isInternal: true,
      createdAt: hoursAgo(1),
    },
  });

  // Comments on ticket 3 (AC not cooling - routine back-and-forth)
  await prisma.comment.create({
    data: {
      ticketId: ticket3.id,
      authorId: staff1.id,
      content: "I checked the unit and the filter looks clean. I suspect low refrigerant or a loose blower connection. I can return tomorrow morning to check levels.",
      isInternal: false,
      createdAt: daysAgo(2),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket3.id,
      authorId: tenant3.id,
      content: "Tomorrow morning works. Please call or text before you arrive so I can put the dog away.",
      isInternal: false,
      createdAt: daysAgo(1),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket3.id,
      authorId: staff1.id,
      content: "Will do. I will arrive between 9-10am and give you a heads up.",
      isInternal: false,
      createdAt: hoursAgo(20),
    },
  });

  // Comments on ticket 4 (garbage disposal)
  await prisma.comment.create({
    data: {
      ticketId: ticket4.id,
      authorId: staff2.id,
      content: "Inspected the unit. The motor is seized and beyond repair. I'll need to install a new disposal unit. Ordering an InSinkErator Badger 5 — should arrive tomorrow.",
      isInternal: false,
      createdAt: daysAgo(2),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket4.id,
      authorId: tenant3.id,
      content: "Sounds good, thank you for the quick response!",
      isInternal: false,
      createdAt: daysAgo(2),
    },
  });

  // Comments on ticket 6 (dishwasher on hold)
  await prisma.comment.create({
    data: {
      ticketId: ticket6.id,
      authorId: staff2.id,
      content: "The drain pump has failed. I've ordered a replacement (Bosch part #00631200). Expected delivery in 3 business days. In the meantime, you can still use the dishwasher but you'll need to manually drain the water after each cycle.",
      isInternal: false,
      createdAt: daysAgo(1),
    },
  });

  await prisma.comment.create({
    data: {
      ticketId: ticket6.id,
      authorId: manager.id,
      content: "Emily, please prioritize this once the part arrives. The tenant has been very patient. Also check if this model has any other known issues we should address while we're at it.",
      isInternal: true,
      createdAt: hoursAgo(12),
    },
  });

  console.log("✅ Created comments (including internal notes)");

  // ========================================================================
  // NOTIFICATIONS
  // ========================================================================

  const notifications = [
    // Manager notifications
    { userId: manager.id, ticketId: ticket1.id, type: NotificationType.TICKET_CREATED, title: "🚨 Emergency Request", message: "Sarah Johnson reported a gas smell in Unit A-201 at Sunset Ridge Apartments", read: false, at: hoursAgo(1) },
    { userId: manager.id, ticketId: ticket1.id, type: NotificationType.SLA_WARNING, title: "SLA Breach - Emergency", message: "Gas smell emergency in Unit A-201 has breached its SLA", read: false, at: hoursAgo(1) },
    { userId: manager.id, ticketId: ticket7.id, type: NotificationType.TICKET_CREATED, title: "New Urgent Request", message: "Sarah Johnson reported an ant infestation in Unit A-102", read: false, at: hoursAgo(6) },
    { userId: manager2.id, ticketId: ticket4.id, type: NotificationType.STATUS_UPDATE, title: "Work Completed", message: "Garbage disposal repair in TH-2 completed — needs verification", read: true, at: daysAgo(1) },
    { userId: manager.id, ticketId: ticket9.id, type: NotificationType.SLA_WARNING, title: "⚠️ SLA Breached", message: "Ceiling water stain ticket exceeded 24-hour SLA", read: false, at: daysAgo(1) },

    // Tenant notifications
    { userId: tenant2.id, ticketId: ticket2.id, type: NotificationType.STATUS_UPDATE, title: "Request In Progress", message: "Your kitchen faucet repair is now in progress", read: true, at: hoursAgo(4) },
    { userId: tenant2.id, ticketId: ticket2.id, type: NotificationType.COMMENT_ADDED, title: "New Comment", message: "James Rodriguez commented on your faucet repair request", read: false, at: hoursAgo(3) },
    { userId: tenant3.id, ticketId: ticket4.id, type: NotificationType.STATUS_UPDATE, title: "Repair Completed", message: "Your garbage disposal has been repaired — please verify", read: false, at: daysAgo(1) },
    { userId: tenant1.id, ticketId: ticket5.id, type: NotificationType.STATUS_UPDATE, title: "Ticket Closed", message: "Your light fixture repair has been completed and closed", read: true, at: daysAgo(6) },

    // Staff notifications
    { userId: staff1.id, ticketId: ticket3.id, type: NotificationType.TICKET_ASSIGNED, title: "New Assignment", message: "You've been assigned to AC repair in Unit B-101", read: true, at: daysAgo(1) },
    { userId: staff1.id, ticketId: ticket8.id, type: NotificationType.TICKET_ASSIGNED, title: "Scheduled Maintenance", message: "HVAC filter replacement assigned for Building A", read: false, at: daysAgo(1) },
    { userId: staff3.id, ticketId: ticket9.id, type: NotificationType.TICKET_ASSIGNED, title: "Urgent Assignment", message: "Ceiling water stain investigation assigned to you", read: true, at: daysAgo(2) },
    { userId: staff3.id, ticketId: ticket9.id, type: NotificationType.SLA_WARNING, title: "⚠️ SLA Breached", message: "Your assigned ticket has exceeded its SLA deadline", read: false, at: daysAgo(1) },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        ticketId: n.ticketId,
        type: n.type,
        title: n.title,
        message: n.message,
        read: n.read,
        link: `/tickets/${n.ticketId}`,
        createdAt: n.at,
      },
    });
  }

  console.log("✅ Created notifications for all roles");

  // ========================================================================
  // SUMMARY
  // ========================================================================

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Database seeded successfully!");
  console.log("=".repeat(60));
  console.log("\n📋 Demo Accounts:");
  console.log("┌─────────────┬──────────────────────────┬──────────┐");
  console.log("│ Role        │ Email                    │ Password │");
  console.log("├─────────────┼──────────────────────────┼──────────┤");
  console.log("│ 🏠 Tenant   │ sarah.johnson@demo.com   │ demo123  │");
  console.log("│ 👔 Manager  │ michael.chen@demo.com    │ demo123  │");
  console.log("│ 🔧 Staff    │ james.rodriguez@demo.com │ demo123  │");
  console.log("└─────────────┴──────────────────────────┴──────────┘");
  console.log("\n📊 Data Summary:");
  console.log(`   Properties: 3 | Buildings: 4 | Units: 11`);
  console.log(`   Users: 10 (2 managers, 5 staff, 3 tenants)`);
  console.log(`   Tickets: 10 (across all statuses)`);
  console.log(`   Activity Logs: ${t1Activities.length + t2Activities.length + t4Activities.length + t5Activities.length + t6Activities.length + t9Activities.length + 1}`);
  console.log(`   Comments: 10 (including internal notes)`);
  console.log(`   Notifications: ${notifications.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
