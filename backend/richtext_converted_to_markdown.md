1\. Why Centralized Logging?
----------------------------

*   **Debugging** → See what went wrong (stack traces, SQL errors, etc.)
    
*   **Auditing** → Who did what (user actions, API calls)
    
*   **Monitoring** → Detect anomalies in production
    
*   **Traceability** → From router → service → repository → DB
    

👉 Always use a **centralized logger** instead of print().

### Router (API layer)

*   Converts **domain exceptions → HTTP responses**
    
*   Logs **request context** (user ID, endpoint, payload).
    
*   Raises HTTPException for FastAPI.
    

### Service (Business logic layer)

*   Knows **domain rules** (e.g., "A user can’t have duplicate goals").
    
*   Catches repository exceptions and raises **business exceptions**.
    

### Repository (DB access layer)

*   Handles **low-level errors** like IntegrityError, NoResultFound, etc.
    
*   Don’t raise HTTP exceptions here (too low-level).
    
*   Wrap database exceptions into **custom exceptions**.
    

Logging Best Practices
----------------------

*   Use **different levels**:
    
    *   DEBUG: internal details (SQL queries, inputs/outputs)
        
    *   INFO: successful business actions (user created goal)
        
    *   WARNING: suspicious activity (duplicate, invalid attempt)
        
    *   ERROR: failures the client should know about
        
    *   CRITICAL: system-wide issues (DB down, service unavailable)
        
*   Always log:
    
    *   User ID / Request ID
        
    *   Endpoint / function name
        
    *   Error details
        
*   Use logger.exception() when catching exceptions (it auto-includes stack trace).
    

| Layer | Raise This Type of Exception | Example |
| --- | --- | --- |
| **Repository** | Custom DB exceptions (wrap SQLAlchemy/DB errors) | `DuplicateEntryError`, `NotFoundError` |
| **Service** | Business/domain exceptions (meaningful to app logic) | `GoalAlreadyExistsError`, `UnauthorizedActionError` |
| **Router/API** | `HTTPException` (maps to client HTTP response) | `raise HTTPException(404, "Not found")` |
| **Global** | Catch-all for unexpected errors | Logs + returns `500 Internal Server Error` |

