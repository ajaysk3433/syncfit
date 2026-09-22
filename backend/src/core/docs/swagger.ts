export const swaggerDocument = {
  openapi: "3.0.3",
  info: {
    title: "SyncFit Gym Management System API",
    version: "1.0.0",
    description:
      "Enterprise-grade backend API for SyncFit Gym Management System. Includes Authentication, Member Lifecycle Management, Membership Plans & Subscriptions, Access Control & Attendance tracking, and Real-Time Occupancy Analytics.",
    contact: {
      name: "SyncFit Engineering Team",
      email: "support@syncfit.internal",
    },
  },
  servers: [
    {
      url: "http://localhost:8080",
      description: "Local Development Server",
    },
  ],
  tags: [
    { name: "Auth", description: "Authentication and Registration" },
    { name: "Members", description: "Member profiles, onboarding, status, and QR access tokens" },
    { name: "Membership Plans", description: "Membership pricing, duration, and feature packages" },
    { name: "Member Subscriptions", description: "Member subscription lifecycle (assign, pause, resume, cancel, renew, upgrade)" },
    { name: "Attendance & Access Control", description: "Check-in/out engine, restrictions validation, auto check-out, and live occupancy" },
    { name: "Analytics", description: "Attendance overview, peak gym traffic hours, and churn risk metrics" },
    { name: "System", description: "Health check and system diagnostics" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Firebase ID Token. Provide header: `Authorization: Bearer <firebase_id_token>`",
      },
      devUserIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-user-id",
        description: "Development/Testing user bypass. Pass user ID UUID directly.",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Resource not found" },
          errorCode: { type: "string", example: "NOT_FOUND" },
          details: { type: "object" },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          firebaseUid: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          phone: { type: "string" },
          role: { type: "string", enum: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"] },
          status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] },
          memberTier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"] },
          avatarUrl: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      MemberProfile: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          dateOfBirth: { type: "string", format: "date" },
          gender: { type: "string" },
          address: { type: "string" },
          city: { type: "string" },
          emergencyContactName: { type: "string" },
          emergencyContactPhone: { type: "string" },
          emergencyContactRelation: { type: "string" },
          healthNotes: { type: "string" },
          fitnessGoals: { type: "array", items: { type: "string" } },
          preferences: { type: "string" },
          referralCode: { type: "string" },
          barcode: { type: "string" },
          qrCodeKey: { type: "string" },
          notes: { type: "string" },
        },
      },
      MembershipPlan: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string", example: "Monthly Standard" },
          tier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"] },
          description: { type: "string" },
          price: { type: "number", example: 49.99 },
          durationDays: { type: "integer", example: 30 },
          features: { type: "array", items: { type: "string" } },
          isActive: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Membership: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          planId: { type: "string", format: "uuid" },
          startDate: { type: "string", format: "date-time" },
          endDate: { type: "string", format: "date-time" },
          status: { type: "string", enum: ["ACTIVE", "PAUSED", "EXPIRED", "CANCELLED", "PENDING"] },
          autoRenew: { type: "boolean" },
          pausedAt: { type: "string", format: "date-time", nullable: true },
          resumedAt: { type: "string", format: "date-time", nullable: true },
          cancelledAt: { type: "string", format: "date-time", nullable: true },
          cancellationReason: { type: "string", nullable: true },
          notes: { type: "string", nullable: true },
        },
      },
      Attendance: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          checkInTime: { type: "string", format: "date-time" },
          checkOutTime: { type: "string", format: "date-time", nullable: true },
          durationMinutes: { type: "integer", nullable: true },
          method: { type: "string", enum: ["QR_CODE", "BARCODE", "MANUAL", "CARD", "BIOMETRIC", "PIN"] },
          status: { type: "string", enum: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT", "DENIED"] },
          denialReason: { type: "string", nullable: true },
          location: { type: "string" },
          notes: { type: "string", nullable: true },
        },
      },
    },
  },
  security: [
    { bearerAuth: [] },
    { devUserIdHeader: [] },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Service Health Check",
        description: "Returns server uptime status and timestamp.",
        responses: {
          200: {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "OK" },
                    timestamp: { type: "string", format: "date-time" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/v1/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register new user/account",
        description: "Creates user in Firebase Auth and synchronizes to PostgreSQL.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "trainer@syncfit.com" },
                  password: { type: "string", minLength: 6, example: "securePassword123" },
                  name: { type: "string", example: "Alex Trainer" },
                  phone: { type: "string", example: "+1234567890" },
                  role: { type: "string", enum: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"], default: "MEMBER" },
                  memberTier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"], default: "STANDARD" },
                  avatarUrl: { type: "string", format: "uri" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "User registered successfully" },
          400: { description: "Validation error" },
          409: { description: "User already exists" },
        },
      },
    },
    "/v1/members": {
      post: {
        tags: ["Members"],
        summary: "Onboard / Create Member",
        description: "Creates user in Firebase & Postgres, initializes profile, generates referral code and QR access token, and assigns optional initial plan.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name"],
                properties: {
                  email: { type: "string", format: "email", example: "john.doe@example.com" },
                  password: { type: "string", minLength: 6, example: "password123" },
                  name: { type: "string", example: "John Doe" },
                  phone: { type: "string", example: "+15551234567" },
                  memberTier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"], default: "STANDARD" },
                  dateOfBirth: { type: "string", format: "date", example: "1990-05-15" },
                  gender: { type: "string", example: "Male" },
                  address: { type: "string", example: "123 Main St" },
                  city: { type: "string", example: "Metropolis" },
                  emergencyContactName: { type: "string", example: "Jane Doe" },
                  emergencyContactPhone: { type: "string", example: "+15559876543" },
                  emergencyContactRelation: { type: "string", example: "Spouse" },
                  healthNotes: { type: "string", example: "None" },
                  fitnessGoals: { type: "array", items: { type: "string" }, example: ["Weight loss", "Muscle gain"] },
                  preferences: { type: "string", example: "Morning workouts" },
                  referralCodeUsed: { type: "string", example: "SF-A1B2C3" },
                  barcode: { type: "string", example: "BC-123456" },
                  planId: { type: "string", format: "uuid" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Member created successfully" },
          400: { description: "Invalid input" },
          409: { description: "Email conflict" },
        },
      },
      get: {
        tags: ["Members"],
        summary: "List Members with Search, Filter & Pagination",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "search", in: "query", schema: { type: "string" }, description: "Search by name, email, phone, referral code, or barcode" },
          { name: "tier", in: "query", schema: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"] } },
          { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] } },
          { name: "role", in: "query", schema: { type: "string", enum: ["ADMIN", "MANAGER", "FRONT_DESK", "TRAINER", "MAINTENANCE", "MEMBER"] } },
          { name: "hasActiveMembership", in: "query", schema: { type: "string", enum: ["true", "false"] } },
        ],
        responses: {
          200: { description: "List of members retrieved" },
        },
      },
    },
    "/v1/members/{id}": {
      get: {
        tags: ["Members"],
        summary: "Get Member Details",
        description: "Retrieves complete profile, active & historical memberships, and visit stats.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Member details retrieved" },
          404: { description: "Member not found" },
        },
      },
      patch: {
        tags: ["Members"],
        summary: "Update Member Profile",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  avatarUrl: { type: "string" },
                  dateOfBirth: { type: "string", format: "date" },
                  gender: { type: "string" },
                  address: { type: "string" },
                  city: { type: "string" },
                  emergencyContactName: { type: "string" },
                  emergencyContactPhone: { type: "string" },
                  emergencyContactRelation: { type: "string" },
                  healthNotes: { type: "string" },
                  fitnessGoals: { type: "array", items: { type: "string" } },
                  preferences: { type: "string" },
                  barcode: { type: "string" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Member profile updated successfully" },
        },
      },
    },
    "/v1/members/{id}/status": {
      patch: {
        tags: ["Members"],
        summary: "Update Member Status",
        description: "Activate, suspend, or deactivate a member (Admin/Manager only).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: { type: "string", enum: ["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"] },
                  notes: { type: "string", example: "Suspended due to overdue payment" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Status updated successfully" },
        },
      },
    },
    "/v1/members/{id}/access-qr": {
      get: {
        tags: ["Members"],
        summary: "Get Member QR Code Token for Check-In",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "QR code key retrieved" },
        },
      },
    },
    "/v1/members/{id}/access-qr/regenerate": {
      post: {
        tags: ["Members"],
        summary: "Regenerate Member QR Code Token",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "New QR code key generated" },
        },
      },
    },
    "/v1/membership-plans": {
      post: {
        tags: ["Membership Plans"],
        summary: "Create Membership Plan (Admin/Manager)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "price", "durationDays"],
                properties: {
                  name: { type: "string", example: "Standard Monthly" },
                  tier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"], default: "STANDARD" },
                  description: { type: "string", example: "Full gym access" },
                  price: { type: "number", example: 49.99 },
                  durationDays: { type: "integer", example: 30 },
                  features: { type: "array", items: { type: "string" }, example: ["Gym Floor", "Lockers"] },
                  isActive: { type: "boolean", default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Plan created" },
        },
      },
      get: {
        tags: ["Membership Plans"],
        summary: "List Membership Plans",
        parameters: [
          { name: "tier", in: "query", schema: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"] } },
          { name: "isActive", in: "query", schema: { type: "string", enum: ["true", "false"] } },
          { name: "search", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Plans retrieved" },
        },
      },
    },
    "/v1/membership-plans/{id}": {
      get: {
        tags: ["Membership Plans"],
        summary: "Get Membership Plan Details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Plan details" },
          404: { description: "Plan not found" },
        },
      },
      patch: {
        tags: ["Membership Plans"],
        summary: "Update Membership Plan",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  tier: { type: "string", enum: ["STANDARD", "PREMIUM", "VIP"] },
                  description: { type: "string" },
                  price: { type: "number" },
                  durationDays: { type: "integer" },
                  features: { type: "array", items: { type: "string" } },
                  isActive: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Plan updated" },
        },
      },
    },
    "/v1/members/{id}/memberships": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Assign Membership Plan to Member",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["planId"],
                properties: {
                  planId: { type: "string", format: "uuid" },
                  startDate: { type: "string", format: "date-time" },
                  autoRenew: { type: "boolean", default: true },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Membership assigned" },
        },
      },
      get: {
        tags: ["Member Subscriptions"],
        summary: "Get Member Subscriptions History",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Membership history retrieved" },
        },
      },
    },
    "/v1/members/{id}/memberships/pause": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Pause / Freeze Active Membership",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  notes: { type: "string", example: "Traveling abroad for 2 weeks" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Membership paused" },
        },
      },
    },
    "/v1/members/{id}/memberships/resume": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Resume Paused Membership (Extends End Date by Paused Duration)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "Membership resumed and expiry date extended" },
        },
      },
    },
    "/v1/members/{id}/memberships/cancel": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Cancel Membership",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["cancellationReason"],
                properties: {
                  cancellationReason: { type: "string", example: "Relocated to another city" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Membership cancelled" },
        },
      },
    },
    "/v1/members/{id}/memberships/renew": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Renew Membership",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  planId: { type: "string", format: "uuid" },
                  autoRenew: { type: "boolean" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Membership renewed" },
        },
      },
    },
    "/v1/members/{id}/memberships/upgrade": {
      post: {
        tags: ["Member Subscriptions"],
        summary: "Upgrade or Change Membership Plan Tier",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newPlanId"],
                properties: {
                  newPlanId: { type: "string", format: "uuid" },
                  notes: { type: "string", example: "Upgraded from Standard to VIP" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Membership upgraded" },
        },
      },
    },
    "/v1/attendance/check-in": {
      post: {
        tags: ["Attendance & Access Control"],
        summary: "Member Check-In (Validates Membership & Account Status)",
        description: "Validates member active status, active unexpired subscription, prevents duplicate check-in, and logs visit.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  memberId: { type: "string", format: "uuid" },
                  qrCodeKey: { type: "string", description: "Scanned QR token" },
                  barcode: { type: "string", description: "Scanned barcode" },
                  email: { type: "string", format: "email" },
                  phone: { type: "string" },
                  method: { type: "string", enum: ["QR_CODE", "BARCODE", "MANUAL", "CARD", "BIOMETRIC", "PIN"], default: "MANUAL" },
                  location: { type: "string", default: "Main Gym" },
                  notes: { type: "string" },
                  overrideRestrictions: { type: "boolean", default: false, description: "Staff bypass for expired accounts" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Check-in successful" },
          403: { description: "Check-in denied (suspended account, expired membership)" },
          404: { description: "Member not found" },
        },
      },
    },
    "/v1/attendance/check-out": {
      post: {
        tags: ["Attendance & Access Control"],
        summary: "Member Check-Out (Calculates Elapsed Duration)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  memberId: { type: "string", format: "uuid" },
                  attendanceId: { type: "string", format: "uuid" },
                  notes: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Check-out completed with durationMinutes" },
          404: { description: "No open check-in session found" },
        },
      },
    },
    "/v1/attendance/auto-checkout": {
      post: {
        tags: ["Attendance & Access Control"],
        summary: "Auto Check-Out Stale Sessions",
        description: "Automatically checks out open sessions that exceed maximum duration threshold (e.g. 4 hours).",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  maxDurationHours: { type: "number", default: 4 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Auto check-out report" },
        },
      },
    },
    "/v1/attendance/occupancy": {
      get: {
        tags: ["Attendance & Access Control"],
        summary: "Get Real-Time Facility Occupancy",
        description: "Returns live occupant count, facility capacity percentage, and list of checked-in attendees with elapsed minutes.",
        parameters: [
          { name: "maxCapacity", in: "query", schema: { type: "integer", default: 150 } },
        ],
        responses: {
          200: { description: "Live occupancy data" },
        },
      },
    },
    "/v1/attendance": {
      get: {
        tags: ["Attendance & Access Control"],
        summary: "List Attendance Logs / History",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "memberId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["CHECKED_IN", "CHECKED_OUT", "AUTO_CHECKED_OUT", "DENIED"] } },
          { name: "method", in: "query", schema: { type: "string", enum: ["QR_CODE", "BARCODE", "MANUAL", "CARD", "BIOMETRIC", "PIN"] } },
          { name: "location", in: "query", schema: { type: "string" } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          200: { description: "Attendance logs" },
        },
      },
    },
    "/v1/attendance/members/{id}": {
      get: {
        tags: ["Attendance & Access Control"],
        summary: "Get Member Attendance History & Visit Summary",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: { description: "Member visit history and stats" },
        },
      },
    },
    "/v1/attendance/analytics/overview": {
      get: {
        tags: ["Analytics"],
        summary: "Overview Attendance Metrics",
        description: "Visits today, this week, this month, unique monthly visitors, and average visit duration.",
        responses: {
          200: { description: "Overview stats" },
        },
      },
    },
    "/v1/attendance/analytics/peak-hours": {
      get: {
        tags: ["Analytics"],
        summary: "Peak Gym Traffic Hours & Heatmap",
        description: "Aggregates visit logs by hour of day (0-23) and day of week to identify peak facility hours.",
        responses: {
          200: { description: "Peak hours analysis" },
        },
      },
    },
    "/v1/attendance/analytics/member-frequency": {
      get: {
        tags: ["Analytics"],
        summary: "Member Visit Frequency & Churn Risk Insights",
        description: "Identifies at-risk members with active memberships but zero check-ins in 14+ or 30+ days, plus top active members.",
        responses: {
          200: { description: "Member retention and frequency metrics" },
        },
      },
    },
  },
};
