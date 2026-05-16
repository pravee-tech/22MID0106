# Stage 1

## Notification System REST API Design

### Features

- Send notifications
- Get all notifications
- Mark notification as read
- Delete notification
- Real-time notification updates

---

## Base URL

```http
http://localhost:5000/api
```

---

# 1. Get Notifications

## Endpoint

```http
GET /notifications
```

## Headers

```json
{
  "Content-Type": "application/json"
}
```

## Response

```json
{
  "success": true,
  "notifications": [
    {
      "id": 1,
      "title": "Placement Update",
      "message": "Interview scheduled tomorrow",
      "type": "placement",
      "isRead": false,
      "createdAt": "2026-05-16T10:00:00Z"
    }
  ]
}
```

---

# 2. Create Notification

## Endpoint

```http
POST /notifications
```

## Request Body

```json
{
  "title": "Hackathon",
  "message": "Hackathon starts tomorrow",
  "type": "event"
}
```

## Response

```json
{
  "success": true,
  "message": "Notification created successfully"
}
```

---

# 3. Mark Notification as Read

## Endpoint

```http
PUT /notifications/:id/read
```

## Response

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

# 4. Delete Notification

## Endpoint

```http
DELETE /notifications/:id
```

## Response

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

# Real-Time Notification Design

- WebSockets can be used for real-time updates.
- Frontend receives notifications instantly without refreshing.
- Backend pushes new notifications to connected users.
- Socket connection improves user experience and reduces repeated API calls.

---

# Notification Object Schema

```json
{
  "id": "number",
  "title": "string",
  "message": "string",
  "type": "string",
  "isRead": "boolean",
  "createdAt": "datetime"
}
```
---

# Stage 2

## Database Choice

I would use PostgreSQL as the primary database because notifications contain structured data and require efficient querying, filtering, sorting, and indexing.

Benefits:
- Fast querying
- Strong relational support
- ACID compliance
- Efficient indexing
- Reliable for large-scale systems

---

## Database Schema

```sql
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    student_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Problems as Data Grows

- Slow query performance
- Increased response time
- High database load
- Large storage usage
- Frequent full table scans

---

## Solutions

- Add indexes on frequently searched columns
- Use pagination
- Cache frequently accessed notifications
- Archive old notifications
- Use read replicas for scaling

---

## Example Queries

### Get All Notifications

```sql
SELECT * FROM notifications
ORDER BY created_at DESC;
```

### Get Unread Notifications

```sql
SELECT * FROM notifications
WHERE is_read = FALSE;
```

### Create Notification

```sql
INSERT INTO notifications(title, message, type, student_id)
VALUES ('Placement Update', 'Interview tomorrow', 'placement', 101);
```

### Mark Notification as Read

```sql
UPDATE notifications
SET is_read = TRUE
WHERE id = 1;
```

### Delete Notification

```sql
DELETE FROM notifications
WHERE id = 1;
```
---

# Stage 3

## Query Analysis

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

This query is accurate because it fetches unread notifications for a specific student.

---

## Why Query is Slow

- Large table size
- Missing indexes
- Full table scan
- Sorting large data repeatedly

---

## Improvements

Add composite indexing:

```sql
CREATE INDEX idx_notifications_student_read_created
ON notifications(student_id, is_read, created_at DESC);
```

This improves:
- Filtering
- Sorting
- Query execution speed

---

## Is Adding Indexes on Every Column Effective?

No.

Adding indexes on every column:
- Increases storage usage
- Slows INSERT and UPDATE operations
- Reduces write performance
- Makes maintenance difficult

Indexes should only be added to frequently queried columns.

---

## Query to Find Placement Notifications in Last 7 Days

```sql
SELECT * FROM notifications
WHERE type = 'placement'
AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Expected Computational Cost

After indexing:
- Search complexity becomes significantly faster
- Reduced table scanning
- Better database optimization

---

# Stage 4

## Problem

Fetching notifications from the database on every page load increases:
- Database load
- Response time
- Server traffic

This creates poor user experience and scalability issues.

---

## Solutions

### 1. Caching

Use Redis caching for frequently accessed notifications.

Benefits:
- Faster response
- Reduced DB queries
- Better scalability

Tradeoff:
- Cache invalidation complexity

---

### 2. Pagination

Load notifications in smaller batches.

Example:
- 10 notifications per request

Benefits:
- Reduced payload size
- Faster loading

Tradeoff:
- Multiple API requests needed

---

### 3. Real-Time Updates

Use WebSockets for live notifications instead of repeated polling.

Benefits:
- Instant updates
- Lower repeated API calls

Tradeoff:
- Persistent socket connection management

---

### 4. Read Replicas

Use database read replicas for handling large read traffic.

Benefits:
- Reduced load on primary DB
- Improved performance

Tradeoff:
- Replication complexity

---

### 5. Background Processing

Use queues for notification delivery.

Benefits:
- Improved reliability
- Non-blocking execution

Tradeoff:
- Additional infrastructure required

---

# Stage 5

## Problems in Current Implementation

- Sending emails sequentially is slow
- Failure in one step can interrupt the entire process
- Database and email operations are tightly coupled
- Difficult to retry failed notifications
- Poor scalability for 50,000 users

---

## Improved Design

Use:
- Queue-based processing
- Background workers
- Retry mechanism
- Parallel processing

---

## Better Architecture

1. Save notification to database
2. Push tasks into message queue
3. Worker services process emails and app notifications independently
4. Failed jobs retry automatically

---

## Why Separate DB Save and Email Sending?

They should be separated because:
- Email APIs may fail
- DB operation should remain successful
- Retry becomes easier
- Better fault tolerance

---

## Reliable Notification Flow

```text
Client Request
      ↓
Save Notification in DB
      ↓
Push Job to Queue
      ↓
Worker Processes Email
      ↓
Worker Sends App Notification
```

---

## Pseudocode

```python
function notify_all(student_ids, message):

    save_notification(message)

    for student_id in student_ids:

        queue.push({
            "student_id": student_id,
            "message": message
        })


worker():

    while queue not empty:

        job = queue.pop()

        try:
            send_email(job.student_id, job.message)
            send_app_notification(job.student_id, job.message)

        except:
            retry_job(job)
```

---

## Benefits

- Faster execution
- Better scalability
- Fault tolerance
- Retry support
- Improved reliability

---

# Stage 6

## Priority Inbox Design

Priority notifications should appear first based on:
- Notification type
- Importance
- Recency

Priority Order:
1. Placement
2. Result
3. Event

---

## Priority Score Logic

Example scoring:

- Placement = 3
- Result = 2
- Event = 1

Recent notifications receive additional weight.

---

## Efficient Top 10 Strategy

Use:
- Max Heap / Priority Queue

Benefits:
- Efficient retrieval
- Faster updates
- Better scalability

Time Complexity:
- Insertion: O(log n)
- Retrieval: O(1)
- Top 10 maintenance efficient

---

## JavaScript Implementation

```javascript
const notifications = [
  {
    id: 1,
    type: "Placement",
    message: "Company hiring",
    timestamp: "2026-05-16"
  },
  {
    id: 2,
    type: "Result",
    message: "Mid-sem results published",
    timestamp: "2026-05-15"
  },
  {
    id: 3,
    type: "Event",
    message: "Hackathon tomorrow",
    timestamp: "2026-05-14"
  }
]

function getPriority(type) {

  if (type === "Placement") return 3
  if (type === "Result") return 2

  return 1
}

function getTopNotifications(data) {

  return data
    .sort((a, b) => getPriority(b.type) - getPriority(a.type))
    .slice(0, 10)
}

console.log(getTopNotifications(notifications))
```

---

## Advantages

- Fast retrieval of important notifications
- Better user experience
- Efficient handling of incoming notifications
- Scalable for large systems