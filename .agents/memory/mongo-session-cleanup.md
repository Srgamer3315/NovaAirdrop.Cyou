---
name: Mongo session cleanup
description: connect-mongo v6 expiry cleanup behavior and its effect on API startup.
---

With connect-mongo v6, the default `autoRemove: "native"` creates a MongoDB TTL index as the session collection initializes. That can force a database connection during API startup. Use an explicit cleanup mode when startup must remain available during a database outage; `"interval"` avoids eager index creation while still cleaning expired records periodically.

**Why:** An unreachable Atlas endpoint caused the native index-creation promise to reject and terminate the API process. Interval cleanup allowed the API to start and return a controlled service error for database-dependent requests.

**How to apply:** When changing `MongoStore.create` options, preserve an explicit `autoRemove` mode and verify database connectivity separately from API liveness. Database-dependent authentication still requires a reachable MongoDB instance.
