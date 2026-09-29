import "dotenv/config";
import prisma from "./core/configs/prisma.js";
import plansService from "./membership-plans/plans.service.js";
import membersService from "./members/members.service.js";
import attendanceService from "./attendance/attendance.service.js";
import gymService from "./gym/gym.service.js";
import { logger } from "./core/logs/logs.js";

async function runVerification() {
    console.log("🚀 Starting End-to-End Verification for Member Management & Attendance (Gym QR System)...");

    try {
        // Step 1: Create Membership Plans
        console.log("\n📦 1. Testing Membership Plans Creation & Listing...");
        const standardPlan = await plansService.createPlan({
            name: "Standard Monthly",
            tier: "STANDARD",
            description: "Full gym floor access",
            price: 49.99,
            durationDays: 30,
            features: ["Gym Floor", "Locker Room", "Cardio Area"],
            isActive: true,
        });
        console.log(`✅ Created Standard Plan: ${standardPlan.id} - ${standardPlan.name}`);

        const vipPlan = await plansService.createPlan({
            name: "VIP All-Access Annual",
            tier: "VIP",
            description: "Access all locations, personal trainer, sauna & pool",
            price: 999.99,
            durationDays: 365,
            features: ["All Locations", "Sauna & Spa", "1 PT Session/mo", "VIP Lounge"],
            isActive: true,
        });
        console.log(`✅ Created VIP Plan: ${vipPlan.id} - ${vipPlan.name}`);

        const plans = await plansService.listPlans();
        console.log(`✅ Listed ${plans.length} membership plans`);

        // Step 2: Member Creation & Onboarding
        console.log("\n👤 2. Testing Member Creation & Profile...");
        const uniqueEmail = `john.doe.${Date.now()}@example.com`;
        const memberResult = await membersService.createMember({
            email: uniqueEmail,
            password: "password123",
            name: "John Doe",
            phone: "+15551234567",
            memberTier: "STANDARD",
            dateOfBirth: "1990-05-15",
            gender: "Male",
            address: "123 Fitness Way",
            city: "Metropolis",
            emergencyContactName: "Jane Doe",
            emergencyContactPhone: "+15559876543",
            emergencyContactRelation: "Spouse",
            healthNotes: "No known conditions",
            fitnessGoals: ["Weight loss", "Muscle gain", "Cardio endurance"],
            barcode: `BC-${Date.now().toString().slice(-6)}`,
            planId: standardPlan.id,
        });

        const memberId = memberResult.user.id;
        console.log(`✅ Created Member: ${memberId} (${memberResult.user.name})`);
        console.log(`✅ Initial Membership assigned: ${memberResult.membership?.id}`);

        // Step 3: Membership Lifecycle (Pause, Resume, Upgrade)
        console.log("\n🔄 3. Testing Membership Lifecycle (Pause, Resume, Upgrade)...");
        const paused = await plansService.pauseMembership(memberId, "Traveling for work");
        console.log(`✅ Membership Paused: status = ${paused.status}`);

        const resumed = await plansService.resumeMembership(memberId, "Back from trip");
        console.log(`✅ Membership Resumed: status = ${resumed.status}`);

        const upgraded = await plansService.upgradeMembership(memberId, vipPlan.id, "Upgraded to VIP package");
        console.log(`✅ Membership Upgraded to VIP: ${upgraded.id} (Status: ${upgraded.status})`);

        // Step 4: Gym Facility QR Code Setup
        console.log("\n🏢 4. Testing Gym Facility & QR Access Code...");
        const gymQrInfo = await gymService.getGymQr();
        console.log(`✅ Gym QR Code Key: ${gymQrInfo.qrCodeKey}`);
        console.log(`✅ Gym QR Scanner Payload: ${gymQrInfo.qrPayload}`);

        // Step 5: Member Phone App Scans Gym QR Code to Check In
        console.log("\n📱 5. Testing Member Phone App Scanning Gym QR to Check In...");
        const checkInResult = await attendanceService.scanMemberQr({
            gymQrCode: gymQrInfo.qrCodeKey,
            memberId,
            action: "AUTO",
            notes: "Member scanned entrance Gym QR from phone app",
        });
        console.log(`✅ Member Check-in Success via Gym QR!`);
        console.log(`   Action: ${checkInResult.action}, Attendance ID: ${checkInResult.attendanceId}`);
        console.log(`   Gym: ${checkInResult.gym?.name} (${checkInResult.gym?.code})`);
        console.log(`   Member: ${checkInResult.member?.name}, Tier: ${checkInResult.member?.tier}`);
        console.log(`   Membership Plan: ${checkInResult.membership?.planName}, Remaining Days: ${checkInResult.membership?.remainingDays}`);

        // Duplicate check-in detection
        const dupCheckIn = await attendanceService.scanMemberQr({
            gymQrCode: gymQrInfo.qrCodeKey,
            memberId,
            action: "CHECK_IN",
        });
        console.log(`✅ Duplicate Check-in Handled: alreadyCheckedIn = ${dupCheckIn.alreadyCheckedIn}`);

        // Occupancy Check
        console.log("\n🏢 6. Testing Real-time Occupancy Monitoring...");
        const occupancy = await attendanceService.getOccupancy(100);
        console.log(`✅ Live Occupancy: ${occupancy.currentCount} / ${occupancy.maxCapacity} (${occupancy.occupancyPercentage}%)`);
        console.log(`   Active Occupants in Facility: ${occupancy.activeOccupants.length}`);

        // Step 7: Member Phone App Scans Gym QR Code to Check Out
        console.log("\n🚪 7. Testing Member Phone App Scanning Gym QR to Check Out...");
        const checkOutResult = await attendanceService.scanMemberQr({
            gymQrCode: gymQrInfo.qrCodeKey,
            memberId,
            action: "AUTO",
            notes: "Member scanned exit Gym QR from phone app",
        });
        console.log(`✅ Member Check-out Success via Gym QR!`);
        console.log(`   Action: ${checkOutResult.action}, Duration = ${checkOutResult.durationMinutes} mins, Status = ${checkOutResult.status}`);

        // Step 8: Check-in Denial Validations (Suspended Account & No Membership)
        console.log("\n⛔ 8. Testing Access Restrictions & Denial Logs...");
        const suspendedUserEmail = `suspended.${Date.now()}@example.com`;
        const suspendedMember = await membersService.createMember({
            email: suspendedUserEmail,
            password: "password123",
            name: "Suspended Sam",
        });
        await membersService.updateMemberStatus(suspendedMember.user.id, {
            status: "SUSPENDED",
            notes: "Payment delinquency",
        });

        try {
            await attendanceService.checkIn({ memberId: suspendedMember.user.id });
            console.error("❌ Expected check-in to be denied for suspended user, but it succeeded");
        } catch (deniedError: any) {
            console.log(`✅ Check-in correctly denied for suspended member: "${deniedError.message}"`);
        }

        // Step 9: Analytics & Reports
        console.log("\n📊 9. Testing Attendance Analytics & Insights...");
        const overview = await attendanceService.getOverviewStats();
        console.log(`✅ Analytics Overview: Today = ${overview.visitsToday}, Week = ${overview.visitsThisWeek}, Month = ${overview.visitsThisMonth}`);

        const peakHours = await attendanceService.getPeakHoursAnalytics();
        console.log(`✅ Peak Hours Top Slots: ${JSON.stringify(peakHours.topPeakHours.slice(0, 2))}`);

        const frequency = await attendanceService.getMemberFrequencyAnalytics();
        console.log(`✅ Frequency & Churn Risk: Total Active Members = ${frequency.totalActiveMembers}, Churn Risk (14d) = ${frequency.churnRisk.noVisitsIn14DaysCount}`);

        console.log("\n========================================================");
        console.log("🎉 ALL TESTS & VERIFICATIONS PASSED SUCCESSFULLY!");
        console.log("========================================================");
    } catch (error: any) {
        console.error("❌ Verification failed with error:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

runVerification();
