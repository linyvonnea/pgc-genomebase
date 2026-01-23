# Activity Logging Implementation Guide

## Overview
This guide explains how to implement comprehensive activity logging in your application to track all user actions including create, update, delete, and other operations.

## Architecture

### 1. **Activity Log Service** (`activityLogService.ts`)
- Centralized service for logging all activities
- Stores logs in Firestore `activityLogs` collection
- Provides query functions to retrieve logs

### 2. **Log Structure**
```typescript
{
  timestamp: Timestamp,
  userId: string,
  userEmail: string,
  userName?: string,
  userRole?: string,
  action: "CREATE" | "UPDATE" | "DELETE" | "VIEW" | "DOWNLOAD" | "GENERATE",
  entityType: "client" | "project" | "inquiry" | "quotation" | "charge_slip" | "user",
  entityId: string,
  entityName?: string,
  changesBefore?: object,
  changesAfter?: object,
  changedFields?: string[],
  description?: string,
}
```

## Implementation Steps

### Step 1: Set Up Firestore Collection
1. The `activityLogs` collection will be created automatically when you first log an activity
2. Create composite indexes in Firebase Console (Settings > Indexes):
   - `userId` (Ascending) + `timestamp` (Descending)
   - `entityType` (Ascending) + `timestamp` (Descending)
   - `entityId` (Ascending) + `timestamp` (Descending)
   - `action` (Ascending) + `timestamp` (Descending)

### Step 2: Configure Firestore Security Rules
Add to your `firestore.rules`:

```javascript
match /activityLogs/{logId} {
  // Only admins can read logs
  allow read: if request.auth != null && 
                get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.role == 'admin';
  
  // Only authenticated users can create logs
  allow create: if request.auth != null;
  
  // Never allow updates or deletes
  allow update, delete: if false;
}
```

### Step 3: Integrate Logging in Your Components

#### Example 1: Edit Client Modal
```typescript
import { logActivity, getUserInfo } from "@/services/activityLogService";
import useAuth from "@/hooks/useAuth";

const onSubmit = async (data: AdminClientData) => {
  const { adminInfo } = useAuth();
  
  try {
    // Store old data
    const oldData = { ...client };
    
    // Perform update
    await updateClientAndProjectName(client.cid!, updateData, ...);
    
    // Log the activity
    await logActivity({
      ...getUserInfo(adminInfo),
      action: "UPDATE",
      entityType: "client",
      entityId: client.cid!,
      entityName: data.name,
      description: `Updated client information`,
      changesBefore: oldData,
      changesAfter: data,
      changedFields: Object.keys(data).filter(key => oldData[key] !== data[key]),
    });
    
    toast.success("Client updated successfully!");
  } catch (error) {
    toast.error("Failed to update client");
  }
};
```

#### Example 2: Delete Operation
```typescript
const handleDelete = async () => {
  try {
    // Get data before deletion
    const clientData = { ...client };
    
    // Delete
    await deleteDoc(doc(db, "clients", client.cid));
    
    // Log
    await logActivity({
      ...getUserInfo(adminInfo),
      action: "DELETE",
      entityType: "client",
      entityId: client.cid!,
      entityName: clientData.name,
      description: `Deleted client: ${clientData.name}`,
      changesBefore: clientData,
    });
  } catch (error) {
    console.error(error);
  }
};
```

#### Example 3: Create Operation
```typescript
const handleCreate = async (data: Client) => {
  try {
    // Create
    const docRef = await addDoc(collection(db, "clients"), data);
    
    // Log
    await logActivity({
      ...getUserInfo(adminInfo),
      action: "CREATE",
      entityType: "client",
      entityId: docRef.id,
      entityName: data.name,
      description: `Created new client: ${data.name}`,
      changesAfter: data,
    });
  } catch (error) {
    console.error(error);
  }
};
```

#### Example 4: PDF Generation
```typescript
const handleGeneratePDF = async () => {
  try {
    // Generate and save
    await saveQuotation(record);
    
    // Log
    await logActivity({
      ...getUserInfo(adminInfo),
      action: "GENERATE",
      entityType: "quotation",
      entityId: record.referenceNumber,
      entityName: `Quotation ${record.referenceNumber}`,
      description: `Generated quotation PDF`,
    });
  } catch (error) {
    console.error(error);
  }
};
```

### Step 4: Add Navigation Link
Add to your admin navigation (e.g., `src/components/layout/AdminNav.tsx`):

```typescript
<Link href="/admin/activity-logs">
  <Button variant="ghost">
    <FileText className="h-4 w-4 mr-2" />
    Activity Logs
  </Button>
</Link>
```

### Step 5: Access Activity Logs UI
- Navigate to `/admin/activity-logs`
- Filter by entity type, action, or search
- Click "View Details" to see full change history
- Export logs to CSV for external analysis

## Best Practices

### 1. **When to Log**
✅ Log these actions:
- All CREATE operations (new clients, projects, inquiries, etc.)
- All UPDATE operations (editing any entity)
- All DELETE operations (removing any entity)
- PDF generation (quotations, charge slips)
- Critical VIEW operations (viewing sensitive data)
- File downloads (if tracking is needed)

❌ Don't log:
- Simple page navigation
- Search queries
- Auto-refresh/polling requests
- Non-critical UI interactions

### 2. **Performance Considerations**
- Logging is async and won't block user actions
- Failed logs won't break the application (error caught silently)
- Consider batching logs for very high-frequency operations
- Set up log retention policies (e.g., keep logs for 1 year)

### 3. **Privacy & Compliance**
- Don't log passwords or sensitive authentication tokens
- Don't log full credit card numbers or banking details
- Consider GDPR/data privacy regulations
- Implement log retention and deletion policies
- Restrict log access to admins only

### 4. **Data to Log**
For CREATE:
- Entity data after creation
- User who created it
- Timestamp

For UPDATE:
- Before and after values
- Changed fields list
- User who made changes
- Timestamp

For DELETE:
- Entity data before deletion
- User who deleted it
- Reason (if available)
- Timestamp

### 5. **Maintenance**
- Set up Firestore TTL (Time To Live) policies
- Archive old logs to Cloud Storage
- Monitor storage costs
- Create aggregated reports monthly
- Set up alerts for suspicious activities

## Advanced Features (Optional)

### 1. Real-time Activity Feed
```typescript
// In a dashboard component
const { data: recentLogs } = useQuery({
  queryKey: ["recentLogs"],
  queryFn: () => getActivityLogs({ limitCount: 10 }),
  refetchInterval: 30000, // Refresh every 30 seconds
});
```

### 2. User Activity Dashboard
```typescript
// Show user's own activity history
const { data: myLogs } = useQuery({
  queryKey: ["myLogs", userId],
  queryFn: () => getActivityLogs({ userId, limitCount: 50 }),
});
```

### 3. Audit Reports
```typescript
// Generate monthly audit report
const { data: monthlyReport } = useQuery({
  queryKey: ["auditReport", month],
  queryFn: () => getActivityLogs({
    startDate: new Date(2026, month, 1),
    endDate: new Date(2026, month + 1, 0),
  }),
});
```

## Troubleshooting

### Missing Logs
- Check Firestore security rules
- Verify user is authenticated
- Check browser console for errors
- Verify indexes are created

### Slow Queries
- Create proper composite indexes
- Limit query results (use `limitCount`)
- Consider pagination for large result sets
- Cache frequently accessed logs

### Storage Costs
- Implement log retention policies
- Archive old logs to cheaper storage
- Don't log overly verbose data
- Consider sampling for high-frequency events

## Summary

This logging system provides:
- ✅ Complete audit trail of all user actions
- ✅ Before/after comparison for updates
- ✅ User attribution for all changes
- ✅ Searchable and filterable logs
- ✅ Export capabilities for compliance
- ✅ Real-time monitoring capabilities
- ✅ Privacy-conscious implementation

Implement gradually:
1. Start with critical operations (DELETE, sensitive data access)
2. Add CREATE operations
3. Add UPDATE operations
4. Add PDF generation and downloads
5. Fine-tune based on needs
