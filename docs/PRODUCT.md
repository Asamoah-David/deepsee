# DeepSee — Product Specification

**Universal Windows Device Operations Platform**
A multi-tenant, web-based Command Center for remotely accessing, monitoring, managing,
automating and supporting Windows devices.

---

## How to use this document

This is the authoritative product specification. Section numbers in parentheses
(for example `§86`) are the canonical citation used in code comments, commit
messages and pull requests. When a change implements or deviates from the spec,
the comment cites the section and explains the deviation. Nothing is built
"because it seemed reasonable" — it is built because a section requires it.

Where this document and a code comment disagree, this document wins and the
comment is a bug.

---

## 1. Vision and positioning

The administrator experience is: **log in → see your devices → choose a device →
operate it.** An administrator should never need to physically touch a machine
for ordinary management after enrollment. (§1)

This is **not** positioned as "another TeamViewer" (§199, §238). Remote desktop is
one capability among many. The product is a centralised operating system for
managing Windows device fleets, combining remote access, device management,
monitoring, mirroring, IT operations, automation, support and AI operations.

Positioning statements (§238):
- "Your Windows machines. One Command Center."
- "Operate every Windows computer from anywhere."
- "The control plane for your Windows fleet."

The mature product lets an administrator open a browser and immediately know:
which computers are online; which have problems; what changed; who needs support;
which software is outdated; which devices are unhealthy; which incidents need
attention; and what can be fixed automatically — then act. (§240, §245)

### 1.1 The five pillars

Every feature must strengthen at least one pillar, or it should not exist. (§2)

| Pillar | Meaning |
|---|---|
| **CONNECT** | Enroll and securely connect devices. |
| **SEE** | Screen mirroring, monitoring, activity, health. |
| **CONTROL** | Remote input, applications, files, commands, device actions. |
| **MANAGE** | Hardware, software, services, configuration, users. |
| **MONITOR** | Performance, activity, network, health, alerts. |
| **SUPPORT** | Tickets, technicians, sessions, diagnostics, communication. |
| **AUTOMATE** | Rules, workflows, deployments, remediation. |
| **OPERATE INTELLIGENTLY** | AI-powered diagnosis, search, recommendations, controlled execution. |
| **GOVERN** | Tenants, administrators, permissions, policies, auditing, security. |

### 1.2 The five layers

The product is layered, and each layer depends on the one beneath it. This is the
build order and it is not negotiable. (§200, §243)

```
1. CONNECTION    enrollment, device identity, communication, remote screen, input
2. MANAGEMENT    files, applications, processes, services, hardware, Windows
3. OBSERVABILITY metrics, events, activity, health, history, alerts
4. AUTOMATION    workflows, policies, scheduled operations, remediation
5. INTELLIGENCE  AI diagnosis, natural-language operations, predictive insight
```

**The most important rule (§243).** Do not build this as a web dashboard plus a
random collection of remote-control features. Build it as:

```
DEVICE IDENTITY → DEVICE CONNECTION → DEVICE STATE → DEVICE CONTROL
→ DEVICE MANAGEMENT → DEVICE OBSERVABILITY → DEVICE AUTOMATION
→ FLEET INTELLIGENCE

---

## 2. Users, tenancy and administration

### 2.1 Who uses it (§3–7)

| Segment | Shape |
|---|---|
| **Individual** | A few personally-owned Windows PCs (desktop, gaming PC, laptop, workstation) managed from one dashboard. No organisation complexity (§178). |
| **Small business** | Office computers, employee PCs, POS machines, admin machines, shared workstations. |
| **School** | Computer labs, admin machines, teacher machines, library, exam and IT-department computers. Structured as labs/departments. |
| **MSP** | Many independent customers, each with its own devices. Multi-tenancy is fundamental here. |
| **Enterprise** | Hundreds to thousands of machines, departments, device groups, many administrators, RBAC, policies, fleet deployment, audit, compliance, reporting. |

### 2.2 Multi-tenancy is a core requirement (§8, §86, §215, §188)

A tenant is an independent organisation. Tenant data must be isolated. A user in
ABC Company must not automatically see XYZ School's devices.

**Every tenant-owned object carries `tenant_id`. Isolation is enforced
server-side at every layer: API, database (RLS), WebSocket/control channel, file
transfer, remote session, automation and reporting. The frontend is never the
mechanism that prevents cross-tenant access.**

A tenant admin console shows only that tenant. (§188)

MSP hierarchy (§132): an MSP has customers; the MSP can switch customer context;
customer administrators see only their own tenant.

### 2.3 Multiple administrators and scopes

A tenant has many administrators. (§9)

```
Owner            full organisation control
Super Admin      everything except organisation deletion
Admin            all devices, policies, applications, automation
IT Manager       all devices, policies, applications; not users or billing
Technician       assigned devices, remote sessions, diagnostics
Help Desk        view + limited remote view
Auditor          read-only, full audit log access
Viewer           read-only device visibility
```

Roles are not enough on their own. Administrators have configurable **scopes**:
everything, certain departments, certain device groups, specific devices, specific
customers, specific features. (§10)

Attribute-based access (§88): User + Department + Device Group + Action + Tenant.
For example, a technician may control devices tagged `Support-A` but not devices
tagged `Executive`.

Least privilege applies **inside** an organisation too. Administrators do not
automatically have every capability. (§224)

Custom roles (§130) let a tenant owner define, for example, a Junior Technician
who can view and control devices but cannot use the terminal, change policies,
manage users or see billing.

### 2.4 Capability matrix (starting point, §225)

| Capability | Owner | Admin | Technician | Viewer |
|---|---|---|---|---|
| View device | yes | yes | yes | yes |
| Remote screen | yes | yes | yes | optional |
| Remote control | yes | yes | yes | no |
| Files | yes | yes | yes | no |
| Terminal | yes | yes | optional | no |
| Deploy applications | yes | yes | optional | no |
| Policies | yes | yes | no | no |
| Billing | yes | optional | no | no |
| Manage administrators | yes | optional | no | no |
| Audit | yes | yes | limited | read |
| Delete organisation | yes | no | no | no |

### 2.5 Operating modes (§178–181)

- **Personal** — "My Computers", no organisation complexity.
- **Business** — organisation, departments, administrators, devices, policies, support, automation, reports.
- **MSP** — MSP → customers → customer admins → customer devices → support → billing → reports.
- **White-label MSP** — the MSP presents the platform under its own brand (§133, §181): custom logo, domain, colours, email, customer-facing branding.

```

Every later feature builds on that foundation. A feature that skips a layer will
have to be rebuilt.


---

## 3. The Command Center

The main web application and the heart of the platform. (§11)

Primary navigation:
Dashboard, Devices, Live Wall, Remote Sessions, Files, Applications, Monitoring,
Diagnostics, Activity, Incidents, Alerts, Automation, Deployments, Policies,
Reports, Support, Enrollment, Users, Organisations, Security, Audit Logs,
AI Operations, Settings.

### 3.1 Dashboard (§12)

Total / online / offline / critical / warning devices, active remote sessions,
open incidents, pending actions, recent alerts, device health, storage problems,
CPU problems, memory problems, failed deployments, Windows update status,
application issues, recent administrator activity.

### 3.2 Universal search (§13)

One global search across device name, user, department, IP, device identifier,
application, incident, alert, administrator, tag and device status. A query like
`low storage` returns all machines with storage problems.

### 3.3 Device directory and device profile (§14, §15)

Every enrolled device has a profile: status, Windows version, CPU, RAM, storage,
network, last seen, assigned user, department, and so on.

Device profile tabs: Overview, Screen, Control, Files, Applications, Processes,
Services, Terminal, Performance, Network, Activity, Diagnostics, Sessions, Alerts,
Automation, Audit.

### 3.4 Device card and quick actions (§166, §167)

A device card shows name, status, OS, CPU, RAM, storage and the actions View,
Control, Files, Terminal, More. The quick action bar offers View, Control, Files,
Message, Terminal, Diagnose, Restart, Lock and More.

### 3.5 Live status (§165)

The administrator never manually refreshes. Status changes propagate in real time.
`PC-17 offline → PC-17 online` appears without interaction.

### 3.6 UX principles

The user must never feel overwhelmed by the feature count. Use progressive
disclosure: Simple = View → Control → Manage. Advanced = Automation → Policies →
Fleet → AI. (§226)

Every action answers five questions: What machine? What am I doing? Do I have
permission? What will happen? Did it succeed? (§228)

Recommended device page layout (§227): header with status and View/Control,
live metrics, quick actions, explainable health, recent activity, applications,
alerts.

### 3.7 Live fleet wall (§105, §168)

A dedicated view of live thumbnails for selected devices, with filters for
department, group, status, customer, location and health. Clicking a thumbnail
opens the full remote view. Used by IT operations, school labs, support centres
and monitoring rooms.

---

## 4. Remote operations

### 4.1 Live screen mirroring (§16)

The core feature. The administrator selects View Screen and sees the live Windows
desktop. Required capabilities: real-time streaming, full-screen mode, resolution
adaptation, quality controls, FPS adaptation, multi-monitor support, monitor
selection, zoom, remote cursor, optional remote control, session statistics,
connection quality, latency display and optional session recording.

The streaming engine must optimise latency, compression, FPS, resolution, network
adaptation, CPU consumption and bandwidth, and adapt: excellent network → high
quality and FPS; poor network → lower bitrate and resolution; very poor network →
prioritise responsiveness. (§83)

### 4.2 Remote control (§17)

An authorised administrator controls mouse, keyboard, Windows UI, applications,
desktop and dialogs.

Modes (§17, §157): **View Only** (no input), **Control** (mouse + keyboard),
**Support** (control + diagnostics + file operations), **Administrative**
(expanded capabilities by permission), and support-session modes View Only,
Remote Control, Audio Support, Screen + Audio, Full Support.

Mode is enforced **server-side**, not by hiding buttons in the browser.

### 4.3 Multi-monitor (§18)

Detect monitors, list them, view an individual monitor, view all monitors, switch
the primary view, full-screen a single monitor, and remote-control a selected
monitor.

### 4.4 Remote audio (§19)

Where authorised: two-way support audio, microphone test, speaker test,
audio-device selection, volume management, audio diagnostics, remote audio
playback, administrative announcements and organisation-wide announcements.

### 4.5 Camera and microphone (§20, §159)

Legitimate, policy-governed functions only: detect cameras, test a camera, view a
camera within a support session, select a camera, diagnose camera problems, and
check whether another application is already using the camera.

**Camera and microphone access requires, in order: a tenant feature flag, a
per-device capability grant, an explicit consent record, and an auditable
support session. Windows privacy controls and the operating system's own
indicator behaviour are respected, not defeated.**

### 4.6 Remote announcements (§21, §118)

Send text ("Please save your work."), text-to-speech so the computer speaks the
message, or an authorised audio announcement. Target one PC, a device group, a
department or the whole organisation, and schedule where appropriate. On a managed
endpoint an announcement may be modal and unskippable, because an organisation is
entitled to compel attention on hardware it manages.

### 4.7 Remote file manager (§22)

Browse, search, upload, download, copy, move, rename, delete, create folders,
compress, extract, transfer large files, resume interrupted transfers, queue
transfers, transfer multiple files, and transfer between managed devices.

The transfer engine supports chunking, resume, hash verification, encryption,
progress, parallel transfer where appropriate, retry, cancellation and integrity
verification. (§84, §220)

### 4.8 PC-to-PC transfer (§23)

`PC-001 ↔ PC-002`, preferring direct peer-to-peer with encrypted transport, and
falling back to relay where a direct path is impossible. Files, folders,
clipboard and selected synchronisation jobs.

### 4.9 Folder synchronisation (§24)

One-way, two-way, scheduled, on-change or manual, with conflict handling and
version history.

### 4.10 Clipboard synchronisation (§25)

Optional per device: text and, where appropriate, images; copy from remote to
local and local to remote. The administrator controls whether it is enabled.

### 4.11 Screenshots and recording (§155, §156)

Request a screenshot during a session for troubleshooting, documentation, support
and incident investigation. Optional manual, scheduled or session recording with a
retention policy.

### 4.12 Session indicators (§158)

A managed device must be able to communicate an active support or monitoring
state, consistent with the capability in use. The platform does not suppress
operating-system privacy indicators.

---

## 5. Device management

### 5.1 Command library (§27)

System: restart, shutdown, log off, lock, sleep, health check, and power-on where
supported. Network: connectivity test, DNS diagnostics, network information,
connection test. Maintenance: storage analysis, temporary-file cleanup, system
diagnostics. Services: start, stop, restart, status. Applications: launch, close,
restart, health check.

### 5.2 Custom and bulk commands (§28, §29)

An administrator composes a reusable action — for example "Fix Printing" = check
print spooler → restart service → check queue → run printer diagnostics →
generate result — and exposes it as a single button.

Bulk commands run against many selected devices and report per-device outcomes:
`87 successful, 8 failed, 5 offline`.

### 5.3 Safe execution and staging (§30)

Before applying a workflow to 500 machines: test on one device → deploy to ten →
deploy to a selected group → deploy globally. This prevents a bad automation from
affecting an entire organisation.

### 5.4 Power management (§31)

Restart, shutdown, log off, lock, sleep, wake where supported, and scheduled
restart/shutdown.

### 5.5 Hardware and software inventory (§32, §33)

Hardware: manufacturer, model, CPU, GPU, RAM, storage, motherboard, BIOS/firmware,
network adapters, displays, audio devices, cameras, connected peripherals and
device identifiers where legitimately available.

Software: installed applications with versions, publishers, install dates, update
status, required applications, unapproved applications and missing required
software.

### 5.6 Software deployment, removal and update (§34, §35, §36)

Flow: select application → select devices → choose deployment policy → deploy →
monitor → report. Results are reported as successful / failed / offline / pending.
Authorised administrators can remotely uninstall approved software, subject to
policy. Update management tracks current version, required version, outdated
devices, update success, update failure and pending updates.

### 5.7 Application control, processes and services (§37, §38, §39)

Application state: running, stopped, crashed, not responding, version, resource
usage; actions launch, close, restart, diagnose.

Processes: process, CPU, RAM, PID, user, status, network usage where available;
actions inspect, stop, restart application, collect diagnostics.

Windows services: running, stopped, disabled, start mode, failures; actions start,
stop, restart, change approved configuration.

### 5.8 Startup, event log and terminal (§40, §41, §26)

Startup inventory with enable/disable where supported, abnormal-startup detection
and change tracking. Event log collection with filtering, severity, timestamp,
source, event identifier, device association and search.

Remote terminal provides controlled execution: interactive terminal, command
history, output capture, execution timeout, script library, scheduled commands,
bulk execution and result aggregation, across PowerShell, Command Prompt,
approved scripts and platform workflows.

### 5.9 Diagnostics and health (§42, §45, §172, §173)

One-click "Diagnose PC" collects a structured health package across CPU, RAM,
disk, network, Windows, drivers, services, applications, recent errors,
performance and connectivity, and produces a PC Health Report.

The health score must be explainable. `Health = Warning` is always accompanied by
its reasons, for example: storage 94%, Windows update failed, service X stopped.
A device scorecard covers availability, performance, storage, software
compliance, update status and monitoring status.

### 5.10 Storage, battery and files (§108, §109, §110)

Storage: total, used, free, drive list, large folders, large files where
authorised, and historical storage. Battery: percentage, charging status, health
where available, power state. File search supports queries such as "find all .pdf
files modified this week", restricted according to organisation policy.

### 5.11 Kiosk, backup, migration, retirement (§101, §111, §112, §144, §145)

Kiosk mode locks a device into an approved application and applies policy —
useful for schools, reception, POS, public terminals and industrial environments.
Optional backup covers selected folders with scheduled backup, version history,
restore, status and failure alerts. Migration moves approved files, selected
settings, organisation configuration and approved application packages from an old
PC to a new one.

Devices can be transferred between departments without reinstalling the agent, and
retired through `Active → Retiring → Retired` with management access removed
according to policy.

### 5.12 Reclaim and asset management (§99, §100)

Track device, serial, purchase date, warranty, assigned user, department,
location, asset number, cost and lifecycle status. Lifecycle: Purchased →
Enrolled → Assigned → Active → Maintenance → Reassigned → Retired. On employee
departure, reclaim can remove the user assignment while preserving organisational
enrollment, transfer ownership within the tenant, apply a new template and prepare
the device for reassignment.

---

## 6. Observability

### 6.1 Performance monitoring and history (§43, §44)

Track CPU, RAM, disk, network, storage, uptime, process activity, application
crashes and performance history, with graphs over today, 7, 30 and 90 days.

### 6.2 Alerts and custom rules (§46, §47)

Built-in examples: CPU above 90% for 10 minutes; storage below 10 GB; device
offline beyond 30 minutes; service stopped; required application missing;
application crash detected; Windows update failed; network problem; device has not
checked in.

Administrators compose rules: `WHEN storage < 15% THEN create alert and notify IT
Manager`, or `WHEN service X stops THEN restart service, wait 60 seconds, check
status, notify administrator if still failed`.

### 6.3 Device activity timeline and change detection (§48, §54, §55, §169–171)

Each device has a chronological timeline combining device events, administrator
actions, alerts, workflow executions, remote sessions and application events: a
single place to understand everything that happened to this computer.

The "what changed?" engine compares two states — for example yesterday versus
today — and reports applications added/removed, services changed, storage changed,
configuration changed and device state changed. Tracked changes cover applications,
services, hardware, configuration, network, important system state, policies and
agent configuration. This historical state is the device "time machine".

### 6.4 Network and internet activity (§49, §50, §102)

Network telemetry: connection status, adapter, IP information, connectivity,
latency, bandwidth, DNS diagnostics, connection failures, network usage and
relevant connection metadata. Network tools: ping, DNS test, connection test,
adapter information, latency, packet-loss diagnostics, configuration information
and connectivity history.

Internet activity monitoring is opt-in per organisation and requires appropriate
authority and policy: network activity, application network usage, domain/DNS
metadata where available, browser/application usage telemetry, timestamps, usage
history, bandwidth consumption and sites accessed where technically available.

**The platform must distinguish metadata and activity telemetry from the contents
of encrypted HTTPS traffic, and must not claim to see encrypted page contents
merely because a device is enrolled.** Tenant-level monitoring policies,
disclosure/notice controls, retention settings, access restrictions and audit logs
are mandatory.

### 6.5 Application and web usage (§51, §52)

Application opened/closed, duration, frequency, crashes and resource usage.
Browser telemetry, where the organisation enables it: visited domains/metadata,
timestamps, browser identity, usage duration, categories and policy violations.

### 6.6 Location, availability and fleet analytics (§53, §106, §174, §175)

Location: current, last known, history and timestamp where Windows capabilities
and permissions allow, configurable per tenant and per device, and disableable
where location is irrelevant.

Availability: online time, offline time, unexpected disconnects and reconnection
frequency. Fleet analytics: average uptime, device health, storage distribution,
application distribution, Windows versions, agent versions, incidents and support
workload.

### 6.7 Monitoring philosophy (§117)

The platform does not force every customer into one monitoring philosophy. A
tenant chooses **Minimal** (device health only), **Standard** (health +
application usage + network telemetry), **Advanced** (detailed activity telemetry
+ historical data + policy monitoring) or **Custom**. Every level supplies
appropriate notice, permissions, retention, access control and auditability.

### 6.8 Data classification and retention (§148, §222, §223)

Categories: Device Metadata (hardware, status), Operational Data (metrics, logs),
User Activity Data (application/network activity), Content Data (files,
screenshots, recordings) and Security Data (audit events). Each can carry its own
retention and access policy.

Tenant-configurable retention, for example activity 30 days, audit 1 year,
recordings 90 days, metrics 180 days, subject to plan and infrastructure.

Organisation administrators configure what is collected, who can see it, how long
it is retained, which devices are monitored and which capabilities are enabled.

---

## 7. Fleet operations

### 7.1 Groups, tags and templates (§59, §60, §61)

Groups such as Accounting, Sales, Management, Laboratory, Support and Remote
Workers, against which operations can be performed.

Tags such as laptop, desktop, Windows 11, Accounting, Critical, High performance,
Low storage, Remote worker and Needs maintenance. **Smart tags are generated
automatically from device state.**

Templates describe required configuration for a class of machine — for example an
Accounting PC Template requiring an accounting application, browser, PDF reader,
security configuration and monitoring policy — and are applied when a new PC
enrolls.

### 7.2 Organisation policies and departments (§62, §129)

Policies cover required applications, monitoring configuration, alert thresholds,
maintenance schedules, remote-access permissions, file-transfer permissions,
administrator permissions, retention periods and device enrollment rules.

Departments can each have their own administrators, devices, policies,
applications, alerts and workflows.

### 7.3 Agent versioning and rollout (§113, §114, §176, §177)

The dashboard shows agent version distribution, for example `4.1 → 187 devices`,
`4.0 → 32 devices`, `3.8 → 4 devices`, and deploys updates progressively: 1% →
10% → 50% → 100%, with the ability to pause a rollout.

Rollback is supported where technically possible: roll back the agent, roll back
configuration, restore a previous policy, reverse workflow changes. If an update
fails: preserve the previous working agent, report the failure, retry, roll back
where supported, and alert an administrator. (§208, §209)

Enterprise deployment supports installer packages, silent installation,
enterprise deployment documentation, enrollment tokens, group deployment and
automated enrollment. (§177)

### 7.4 Feature flags and per-device capabilities (§115, §116)

Tenant-level flags such as `RemoteControl = ON`, `FileTransfer = ON`,
`Camera = OFF`, `Audio = ON`, `Monitoring = ON`, `AI = OFF`.

Per-device capability grants for Screen View, Remote Control, Files, Terminal,
Audio, Camera, Location, Monitoring and Automation. Permissions can differ per
organisation.

### 7.5 Bandwidth and resource management (§138, §139)

Tenant policies control maximum screen bandwidth, monitoring frequency,
file-transfer limits, upload limits, session quality and similar.

The agent must never become the problem. Targets: low CPU when idle, low RAM, low
network usage, efficient telemetry and adaptive screen streaming.

### 7.6 Device status vocabulary (§104)

`ONLINE`, `OFFLINE`, `CONNECTING`, `DEGRADED`, `ENROLLING`, `UPDATING`, `ERROR`.

### 7.7 Command queueing and result semantics (§122, §123, §124, §229)

If a device is offline, an action such as "restart service" is reported as
`Queued`, and may execute when the device reconnects if its authorisation and
policy are still valid. Disruptive operations must respect expiry and policy.

The Command Center must clearly indicate `Device offline` rather than pretending an
operation succeeded. Available responses are retry, queue and cancel.

Every operation returns one of: `pending`, `running`, `success`, `failed`,
`timed_out`, `cancelled`, `device_offline`, `permission_denied`.

**The platform never silently claims success.** A failed command reports `FAILED`,
not "completed". An offline device reports `OFFLINE`, not a perpetual "processing".

### 7.8 Error experience (§230)

Errors explain what happened, why, what can be done, and whether retry is possible.

### 7.9 Device discovery (§103)

For enterprise deployments, approved discovery and enrollment workflows for
machines on an organisation's network. **Discovery does not automatically grant
control** — a discovered device remains unmanaged until properly enrolled.

---

## 8. Automation

### 8.1 Automation engine (§63)

The core model is `TRIGGER → CONDITION → ACTION → VERIFICATION → RESULT`.

```
storage < 10GB → run approved cleanup → recheck storage → still < 10GB?
→ create incident
```

### 8.2 Scheduled and event-driven automation (§64, §65)

Scheduled example: every Sunday run health check, disk analysis, approved cleanup,
application checks and generate a report.

Event-driven examples: device comes online → collect state; application crashes →
collect diagnostic data; service stops → restart approved service; storage becomes
critical → execute approved remediation.

### 8.3 Bulk automation (§66)

Run workflows across a device, device group, department or entire organisation with
dry run, staging, approval, execution, verification and reporting.

### 8.4 Workflow builder and marketplace (§70, §71)

A visual editor:

```
WHEN device storage < 10GB
IF   temporary files > 2GB
THEN cleanup
THEN recheck
IF FAILED then create incident
```

This becomes a low-code automation system. A marketplace of prebuilt workflows
includes fix printing, clear approved temporary files, restart application,
diagnose network, check disk, collect health report, restart service and deploy
approved software. Organisations can create their own.

### 8.5 Notification and health automation (§150, §151, §152, §153)

Notification rule example: `IF PC offline > 15 minutes THEN notify IT Manager`.

Device health automation example: `IF CPU > 90% FOR 10 minutes THEN collect
diagnostics; IF process > threshold THEN create incident`.

Application health automation example: `WHEN AccountingApp crashes THEN collect
logs, restart application; IF it crashes again within 5 minutes THEN create
incident`.

Security automation: suspicious device state → alert → restrict selected
capabilities → notify administrator → collect diagnostic information.

**The platform does not silently make destructive decisions.**

### 8.6 Approval workflows (§121, §194)

Sensitive or disruptive operations can require approval. A technician requests
"restart PC-17", a manager approves, the system executes, and every step is logged.

### 8.7 Remote lockdown (§154)

For appropriately managed devices, controlled administrative actions such as lock
workstation, restrict selected capabilities, disable remote access and isolate from
platform management. Any stronger endpoint or network isolation is designed as an
explicit enterprise security feature rather than hidden behaviour.

---

## 9. Support

### 9.1 Incident centre (§56)

A central place for problems. An incident has an id, affected device set, status,
severity, assignment and timeline. Capabilities: assign a technician, add notes,
attach diagnostic reports, start a remote session, run a workflow, track a
timeline and resolve.

### 9.2 Ticketing (§57)

A user reports "My computer is slow"; the platform creates a ticket with customer,
device, issue, status and assignee. A technician can view the device, run
diagnostics, start a remote session, transfer approved files, run approved
workflows and document the resolution.

### 9.3 Support sessions and modes (§157)

View Only, Remote Control, Audio Support, Screen + Audio and Full Support.
Permissions determine what each technician may use.

### 9.4 Communication centre (§118)

Administrators communicate with users and devices through messages,
notifications, announcements, text-to-speech, support audio sessions and support
requests.

### 9.5 User presence (§119)

Where available: logged-in user, active session, idle/active state and session
duration.

### 9.6 Remote support request (§120)

A user presses "Request IT Support". The administrator receives a support request
with PC, user and problem description, and a technician accepts it.

### 9.7 Customer portal (§58)

Optional customer-facing portal where customers view their devices, submit
tickets, request support, see support status, approve sessions and view reports.

---

## 10. Platform architecture

### 10.1 Shape (§79, §241)

```
COMMAND CENTER (web dashboard)
      │
API gateway / route handlers
      │
AuthN + AuthZ + Tenant service
      │
Device control plane ─── Device connection layer ─── Windows Agents
      │
Supporting services: identity, organisations, devices, sessions, files,
monitoring, events, alerts, automation, deployments, support, billing, audit,
notifications, AI
```

### 10.2 Control plane versus data plane (§80)

**Control plane**: authentication, device registration, commands, policies,
sessions, metadata, permissions.
**Data plane**: screen streams, audio, large file transfers, P2P traffic, relay
traffic.

Keeping them separate is what allows the platform to scale efficiently.

### 10.3 Peer-to-peer and relay (§81, §82)

Where possible, PC A ←→ PC B directly rather than through the server, with a relay
as fallback when direct connectivity is impossible. All communication is
encrypted.

Relay use cases: NAT, corporate firewalls, restricted networks, direct-connection
failure. The relay must not become an unnecessary permanent bottleneck for all
traffic.

### 10.4 Windows Agent (§77, §78, §206)

The agent is a native Windows component, not a browser tab. It is a long-running
Windows Service registered with the Service Control Manager, engineered for
startup reliability, updates, recovery, low resource consumption, secure storage,
connectivity and crash recovery.

Conceptual architecture:

```
Windows Agent
├── Core Service
├── Device Identity
├── Communication Engine
├── Remote Desktop Engine
├── Input Engine
├── File Engine
├── Monitoring Engine
├── Diagnostics Engine
├── Command Engine
├── Application Engine
├── Automation Engine
├── Audio Engine
├── Camera Module
├── Update Engine
├── Policy Engine
└── Security Module
```

**Split-process requirement.** Windows Session 0 isolation means a service cannot
capture the interactive desktop or inject input. The architecture is therefore two
processes: a SYSTEM service in Session 0 that owns identity, connectivity,
telemetry and command validation, and a worker process launched into the active
user session that performs screen capture, input injection, file operations and
interactive diagnostics. They communicate over a local IPC channel (§206).

### 10.5 Installation and updates (§207, §208, §209)

Distribution routes: signed EXE/MSI, MSIX, enterprise deployment, USB package,
direct website download and organisation-specific installer.

Agent update flow: new version → download → verify signature → stage → install →
restart components if necessary → reconnect → verify.

### 10.6 Offline-first agent (§137, §218, §219)

The managed PC must work fully without internet. Only the administration Command
Center requires connectivity. The agent maintains local configuration, queues
permitted telemetry, queues approved commands where appropriate, records local
health and reconnects automatically.

Reconnection: connection lost → retry → backoff → reconnect → authenticate →
`ONLINE`.

### 10.7 Real-time infrastructure (§136, §165)

Real-time communication is used for device status, commands, alerts, session state
and monitoring updates.

### 10.8 Scalability (§135)

The control plane is designed for horizontal scaling across 10, 100, 1,000,
10,000, 100,000 and 1,000,000+ devices.

### 10.9 Multi-region (§134)

Eventually: multiple regions, regional control plane, regional relay servers, data
residency and organisation-specific region.

### 10.10 Database entities (§85)

Users, organisations, memberships, roles, permissions, devices, device keys,
enrollment sessions, device groups, tags, policies, applications, processes,
services, sessions, files, transfers, commands, workflows, workflow runs, alerts,
incidents, tickets, audit logs, activity events, device metrics, reports,
notifications, subscriptions, invoices, API keys and integrations.

---

## 11. Security

Security is foundational, not a feature. (§140)

### 11.1 Required properties (§140, §141)

Encryption, device identity, authentication, authorization, tenant isolation, MFA,
RBAC, audit logs, session controls, revocation, key rotation, secure updates,
signed binaries, rate limiting and abuse prevention.

**Zero-trust**: never assume "this device is inside the company network, therefore
it is trusted". Every device and session authenticates; every action is authorised.
(§141)

**Zero trust between tenants (§215)**: Tenant A's device connection must never be
routable as Tenant B's device. Tenant identifiers are enforced at the API,
database, WebSocket/control channel, file transfer, remote session, automation and
reporting layers.

### 11.2 Authentication and revocation (§93, §142, §143)

Administrator accounts support password, MFA, passkeys where supported, session
management, device/session revocation and login history with logout.

Device revocation immediately prevents future management access. An owner can
disable an administrator, revoke sessions, reset MFA, remove access and review
administrator activity.

### 11.3 Command and session security (§210, §211, §212, §213)

Every command carries tenant, device, administrator, action, permission,
timestamp, command id and expiration. **The agent validates that an operation is
legitimate before executing it.**

Replay protection uses unique command ids, expiration, server-side authorisation,
device verification and result tracking.

Each remote session has an authenticated administrator, an authorised device, a
session id, start/end time, capability scope, audit trail and revocation.

Device keys support renewal, revocation, re-enrollment and compromised-device
isolation.

### 11.4 Secret storage (§214)

Never store sensitive credentials as plaintext. Use OS-protected credential
storage, encryption, a key hierarchy and secure secret management.

### 11.5 Auditing and session logging (§89, §90, §91, §146)

Record who, what, when, which device, which organisation, action, result, IP/session
information where appropriate, and before/after state where appropriate. Example:
`Admin: John, Action: Restart Service, Device: PC-017, Time: 14:31, Result: Success`.

Remote session logging records the session creator, device, start, end, duration,
mode, actions, recording if enabled, and session result.

Optional session recording captures screen, session metadata and support notes,
useful for training, auditing, support quality and incident investigation, with
retention configurable by tenant.

The audit centre answers: who restarted PC-17? who downloaded this file? who viewed
this device? who changed the monitoring policy? who created this workflow?

### 11.6 API keys and webhooks (§94, §95, §96)

Organisations create API credentials for legitimate integrations with scopes such
as read devices, manage devices, read metrics, run approved workflows and read
incidents. **Never create unrestricted keys by default.**

Webhooks deliver `device.online`, `device.offline`, `device.enrolled`,
`device.health_changed`, `alert.created`, `incident.created`, `workflow.completed`
and `deployment.failed`.

Notification channels include in-app, push, webhook and SMS.

### 11.7 Compliance, retention and deletion (§147, §148, §149, §216)

Enterprise tenants define retention, access policies, audit requirements,
monitoring policies, administrative approval and data residency.

Data deletion supports device, user and organisation deletion, data export,
retention expiry and tenant offboarding.

Disaster recovery covers database backups, metadata backups, configuration
backups, multi-region recovery, service restoration and agent reconnection. High
availability avoids single points of failure via replication, load balancing,
queues, failover and health checks. (§217)

### 11.8 Security centre and testing (§92, §233)

The security dashboard reports device counts by health, recent suspicious events,
recent admin actions, policy violations and failed authentications.

Security testing must cover tenant isolation, authorization, session hijacking,
replay, token theft, device impersonation, admin compromise, file access, command
injection, workflow abuse and API abuse.

### 11.9 Product boundary (§160, §236, §237)

The platform is powerful enough for legitimate enterprise management while
respecting operating-system security boundaries.

**This platform is not designed around, and will not implement: password
cracking; bypassing Windows authentication; bypassing encryption; circumventing
activation locks; defeating OS security; hidden camera activation; hidden
microphone activation; suppressing operating-system privacy indicators; or
concealing from the person at the machine that they are being monitored or
remotely controlled.**

Device recovery integrates with legitimate mechanisms instead: account recovery,
administrator recovery, recovery keys, organisation management and reset or
redeployment workflows.

Security is configurable, not an excuse to remove legitimate enterprise
capability. One organisation may enable remote control and disable camera support,
enable activity monitoring, restrict file transfer, limit the terminal to
administrators and enable recording. Another chooses differently. The platform
supplies the capability and the policy controls.

---

## 12. Enrollment and device identity

Enrollment must be extremely fast: target 10–60 seconds. (§72)

### 12.1 Method A — enrollment link (§72)

Administrator: Command Center → Add Device → Generate Enrollment Link. The system
creates a temporary enrollment session. The administrator sends the link. The user
clicks it, downloads the Windows Agent, runs the installer. The agent knows which
enrollment session it belongs to. The user confirms `Connect this PC to ABC
Company?` and clicks Connect.

### 12.2 Method B — USB enrollment (§73)

Administrator: Command Center → Add Device → Create USB Enrollment Package. This
downloads the Windows Agent installer plus a temporary enrollment package. These
are copied to USB, the USB goes into the Windows PC, the user runs the installer,
enters the enrollment code, and clicks Connect.

### 12.3 Enrollment security (§74, §75)

**The enrollment code or link is not the permanent device credential.**

```
Temporary enrollment → agent generates device keypair → server verification
→ permanent device identity → enrollment token expires
```

Every device receives a unique cryptographic identity:

```
Device
├── Device ID
├── Public Key
├── Private Key
└── Tenant Association
```

The private credential stays protected on the device and is never transmitted to
the server. Enrollment credentials are single-use and time-limited.

### 12.4 Persistent connection (§76)

```
Windows starts → agent starts → agent authenticates → server recognises device
→ device becomes ONLINE
```

No repeated enrollment.

### 12.5 First synchronisation and onboarding (§163, §164)

Immediately after enrollment the agent reports device identity, Windows version,
hardware, storage, network, displays, applications, services, agent version and
device capabilities, and the Command Center populates rapidly.

Onboarding checklist: connected; device identity established; hardware collected;
software inventory collected; monitoring started; policy assigned; device ready.

### 12.6 Enrollment administrator and user experience (§161, §162)

Administrator options: Send Enrollment Link, Create USB Package, Download
Installer, Enterprise Deployment.

User experience target, under 60 seconds:
`receive link → download agent → install → connect → done`, or
`insert USB → run agent → enter code → connect → done`.

### 12.7 Enrollment in the data model

`enrollment_sessions` stores the code, creator, expiry, single-use marker and the
resulting device. `device_keys` stores device public keys and rotation history.

---

## 13. AI Operations

### 13.1 Assistant (§67, §127)

A natural-language interface for queries such as "show all computers with less than
20 GB free", "why is PC-17 slow?", "which devices haven't checked in today?", "find
machines with the failed accounting application", "run the approved cleanup
workflow on those machines", "which computers are having network problems?", "what
changed on the accounting PCs this week?", "which machines have the oldest agent?"

**The AI operates through permission-scoped tools rather than unrestricted system
access.**

### 13.2 AI diagnostics (§68)

AI analyses authorised logs, performance data, application failures, system state,
network diagnostics and device history, and outputs:

```
Possible cause:   Application X has crashed 17 times today.
Evidence:         Crash frequency increased after version 4.2.
Suggested fix:    Update or roll back the application.
Available action: [Run approved remediation]
```

### 13.3 AI safety model (§69, §195, §196)

AI actions carry tool permissions, tenant policies, administrator permissions,
confirmation levels, action previews, audit records and rollback where possible.
High-impact actions require confirmation.

Every AI-initiated operation is auditable:

```
AI suggested:   Restart Service X
Administrator:  John approved
Execution:      Success
Timestamp:      ...
```

**The AI never becomes the only control layer.** Everything important remains
understandable and operable through the normal UI. The AI is an accelerator, not
the only way to operate the system.

---

## 14. Enterprise and commercial

### 14.1 Reporting and export (§97, §98)

Reports: device inventory, health, software, activity, security, support,
deployment, automation and administrator activity. Export to CSV, PDF and JSON.

### 14.2 Organisation dashboard and departments (§128, §129)

Organisation → devices, departments, users, administrators, policies,
applications, incidents, tickets, automation, reports, security.

### 14.3 Billing and plans (§131, §189, §190)

SaaS pricing can be based on devices, administrators, features, storage,
monitoring level, support modules and automation usage. Plans: Personal,
Professional, Business, Enterprise, MSP.

Limits are enforced by the backend: Free 5 devices, Pro 50, Business 500,
Enterprise custom.

The billing engine supports trials, subscriptions, device limits, feature limits,
usage-based billing, invoices, payment status, upgrades, downgrades and
cancellation.

### 14.4 Onboarding and administration (§192, §193)

New organisation: create organisation → invite administrators → create groups →
create policies → enroll devices → assign devices → configure monitoring → ready.

Administrator invitations are sent by email or organisation invitation with a role
assignment. Invitations expire.

### 14.5 Integrations and API-first design (§182, §183, §184, §185)

Integrations: identity, help desk, communication, notifications, SIEM, asset
management, enterprise management and billing.

The core platform remains functional without external SaaS dependencies. Build the
platform internally around well-defined APIs even where customers never call them:
the dashboard, automation engine and integrations communicate through controlled
backend interfaces.

The platform owns as much core infrastructure as practical: device protocol,
control plane, device identity, database, automation, management logic, UI,
monitoring and relay infrastructure. External services are optional integrations
rather than existential dependencies.

### 14.6 Observability and the platform console (§186, §187, §235)

The platform monitors itself: API latency, agent connections, relay health,
database health, queue depth, workflow execution, failed commands, streaming
sessions, file transfers and error rates.

A separate platform admin console (not the customer Command Center) manages
tenants, subscriptions, infrastructure, abuse reports, platform health, support,
feature flags and system metrics. Platform administrators do not automatically have
unrestricted visibility into customer content; access is controlled, auditable and
policy-driven.

Every service exposes health, metrics, logs, traces and error rates.

### 14.7 Product analytics (§191)

Measure devices enrolled, active devices, sessions, commands, file transfers,
workflows, incidents, retention and feature adoption.

### 14.8 Future clients (§197, §198)

The primary Command Center is web-based. A mobile admin app (alerts, device status,
emergency actions, approvals, remote session initiation) and a native desktop
console are future optional work. Neither is required for the initial product.

---

## 15. Delivery plan

### 15.1 Release stages (§201–204)

**MVP.** Web Command Center: authentication, organisations, users, roles, devices,
enrollment, device status. Windows Agent: secure identity, persistent connection,
heartbeat, basic telemetry. Remote access: screen mirroring, remote control,
multi-monitor, session management. Files: browse, upload, download, transfer. Basic
management: CPU, RAM, storage, processes, services, restart, lock, shutdown.
Security: tenant isolation, RBAC, MFA, device revocation, audit logs.

**V1.** Application inventory, software deployment, diagnostics, alerts,
monitoring, mirroring, device history, remote terminal, automation, device groups,
policies, support tickets, reports.

**V2.** AI operations, advanced fleet automation, advanced analytics, PC-to-PC
transfer, folder synchronisation, session recording, customer portal, MSP
functionality, white-label, advanced deployment, asset management.

**Enterprise.** SSO, advanced identity, enterprise deployment, advanced policies,
approval workflows, data residency, multi-region, advanced auditing, custom roles,
custom integrations, advanced SLA, dedicated infrastructure options.

### 15.2 Development phases (§205)

Phase 1 Architecture · Phase 2 Authentication and multi-tenancy · Phase 3 Windows
Agent · Phase 4 Enrollment · Phase 5 Persistent device connection · Phase 6 Screen
streaming · Phase 7 Remote input · Phase 8 File transfer · Phase 9 Device
management · Phase 10 Monitoring · Phase 11 Diagnostics · Phase 12 Automation ·
Phase 13 Support · Phase 14 Enterprise · Phase 15 AI.

### 15.3 Development priority (§242)

Build from the bottom upward.

- **Foundation**: multi-tenancy, authentication, authorization, device identity,
  Windows Agent, secure connection, enrollment.
- **Remote operations**: screen streaming, remote control, file transfer, device
  information, power management.
- **Device management**: applications, processes, services, terminal, diagnostics.
- **Observability**: metrics, activity, alerts, history, reports.
- **Fleet operations**: groups, policies, deployments, automation, bulk operations.
- **Support**: tickets, customer portal, technician workflows, session recording.
- **Intelligence**: AI diagnostics, natural-language operations, automated
  remediation, predictive insights.
- **Enterprise**: SSO, advanced roles, advanced audit, MSP, white-label,
  multi-region, enterprise integrations.

---

## 16. Non-negotiable engineering rules

These are drawn from the sections above and are enforced in review.

1. **Tenant isolation is server-side.** `org_id` is stamped from server-derived
   values, never from client input, and every tenant table enforces it in RLS with
   both `USING` and `WITH CHECK`. (§8, §86, §215)
2. **No silent success.** Every operation reports one of the explicit result
   states. A failure reports failure; an offline device reports offline. (§124,
   §229)
3. **Device identity is cryptographic.** The private key never leaves the device;
   enrollment credentials are single-use and expire. (§74, §75, §213)
4. **The agent validates authorisation before executing.** Command id, expiry,
   tenant, device and permission are checked on the device, not only in the cloud.
   (§210, §211)
5. **Session mode is enforced server-side.** View-only is a server decision, not a
   hidden button. (§17, §212)
6. **Secrets are never plaintext or committed.** There are no fallback values for
   required credentials; a missing secret fails loudly at boot. (§214)
7. **No OS-security bypass, no covert capture, no indicator suppression.** (§160,
   §237)
8. **Explainability over mystique.** Health scores, AI output and automation
   results state their reasons. (§45, §68)
9. **The database layer is idempotent.** Migrations re-run cleanly and are guarded
   against concurrent application. (§216, §217)
10. **The platform monitors itself.** Health, metrics and traces on every service.
    (§186, §235)




