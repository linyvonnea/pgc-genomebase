# Tab State Retention Guide

## Overview
This guide explains how state is preserved when switching between tabs in the PGC GenomeBase admin dashboard.

## How Tab System Works

### Tab Bar
- Tabs appear at the top of the admin dashboard
- Each tab represents an open admin section (Dashboard, Clients, Projects, Quotations, etc.)
- Clicking a tab navigates to that page
- Tabs can be closed individually

### State Management Architecture

Due to Next.js App Router architecture, **only one page is rendered at a time**. When you switch tabs, the previous page component unmounts and the new one mounts. However, state is preserved through multiple strategies:

## 1. React Query Data Caching (Primary Method)

### Configuration
Location: `src/lib/react-query-provider.tsx`

```tsx
{
  queries: {
    gcTime: 1000 * 60 * 10,      // Cache data for 10 minutes
    staleTime: 1000 * 60 * 5,    // Data fresh for 5 minutes
    refetchOnMount: false,        // Don't refetch if data is fresh
    refetchOnWindowFocus: true,   // Refetch when tab becomes active
    retry: 1,                     // Retry failed requests once
  }
}
```

### What This Means
- **Data Persists**: When you navigate from "Clients" tab to "Projects" tab and back to "Clients", the clients list data is still cached
- **No Unnecessary Fetches**: If you return to a tab within 5 minutes, data won't be refetched
- **Automatic Updates**: If you switch browser tabs and come back, data refreshes automatically
- **Memory Management**: Cached data is cleared after 10 minutes of inactivity

### Applies To
- ✅ All data fetched with `useQuery` hooks
- ✅ Lists (clients, projects, quotations, inquiries)
- ✅ Individual records
- ✅ Dropdown options and service catalogs
- ✅ Activity logs and history panels

## 2. Form State (Currently NOT Persisted)

### Current Behavior
Form inputs (like quota builder, project forms) **lose their state** when switching tabs because the component unmounts.

### Future Solutions (Not Yet Implemented)

#### Option A: URL Search Params
```tsx
// Example: Preserve filter selections
const [searchFilter, setSearchFilter] = useState("");

// Save to URL
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  params.set('search', searchFilter);
  router.replace(`${pathname}?${params.toString()}`);
}, [searchFilter]);

// Restore from URL on mount
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  setSearchFilter(params.get('search') || '');
}, []);
```

#### Option B: SessionStorage for Form Drafts
```tsx
// Example: Auto-save form drafts
useEffect(() => {
  const draftKey = `formDraft_quotation_${inquiryId}`;
  sessionStorage.setItem(draftKey, JSON.stringify(formData));
}, [formData, inquiryId]);

// Restore draft on mount
useEffect(() => {
  const draftKey = `formDraft_quotation_${inquiryId}`;
  const saved = sessionStorage.getItem(draftKey);
  if (saved) setFormData(JSON.parse(saved));
}, [inquiryId]);
```

#### Option C: Context/Zustand for Global State
For complex state that needs to persist across many components.

## 3. UI State

### Currently Preserved
- ❌ Scroll position (resets on navigation)
- ❌ Modal open/closed state
- ❌ Expanded/collapsed sections
- ❌ Selected table rows
- ❌ Active filters in dropdowns

### Why Not Preserved
These states live in component memory, which is cleared when components unmount. Preserving them requires explicit implementation using techniques from #2 above.

## Best Practices

### For Developers

1. **Use React Query for ALL data fetching**
   - Ensures automatic caching and state retention
   - Provides loading and error states out of the box
   ```tsx
   const { data, isLoading, error } = useQuery({
     queryKey: ['projects'],
     queryFn: getProjects,
   });
   ```

2. **Keep query keys consistent**
   ```tsx
   // Good - consistent key structure
   ['quotations', referenceNumber]
   ['projects', projectId]
   ['clients']
   
   // Bad - will create duplicate caches
   ['quotation_data', referenceNumber]
   ['quotation', referenceNumber]
   ```

3. **Invalidate queries when data changes**
   ```tsx
   const queryClient = useQueryClient();
   
   await updateProject(projectId, newData);
   queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
   ```

4. **For forms that should persist**
   - Consider adding sessionStorage auto-save
   - Or use URL params for filter state
   - Or add "Save Draft" functionality

### For Users

#### Data That Automatically Persists
- ✅ Lists you've loaded (clients, projects, quotations)
- ✅ Individual records you've viewed
- ✅ Dropdown options
- ✅ Recently fetched data (fresh for 5 minutes)

#### Data That Does NOT Persist
- ❌ Form inputs in quotation/charge slip builders
- ❌ Modal dialogs (will close)
- ❌ Selected checkboxes
- ❌ Filter selections
- ❌ Scroll positions

#### Workarounds
1. **Avoid switching tabs while editing forms** - complete your work first
2. **Data refreshes automatically** - when viewing lists, the cached data displays immediately
3. **Use the refresh button** if you want to force-fetch latest data

## Technical Limitations

### Why Can't We Keep Components Mounted?

Next.js App Router uses **file-based routing** where only one page component can be active at a time. The alternatives we explored:

1. ❌ **Lazy loading all pages as client components** - Breaks server-side data fetching and server actions
2. ❌ **Preventing Next.js navigation** - Breaks URL routing, back button, and bookmarking
3. ❌ **Rendering all tabs simultaneously** - Server components can't be conditionally rendered this way

### The Chosen Approach
✅ **Let Next.js handle routing naturally + aggressive React Query caching**

This provides:
- Fast perceived performance (cached data shows instantly)
- Server-side rendering benefits
- Proper URL routing
- Standard Next.js patterns
- Room for future enhancements (URL state, form drafts)

## Performance Characteristics

### Tab Switching Speed
- **First visit**: Full page load + data fetch (~500-1500ms)
- **Return visit (within 5 min)**: Instant from cache (~50-100ms)
- **Return visit (after 5 min)**: Instant cached display + background refresh
- **Return visit (after 10 min)**: Full refetch (~500-1500ms)

### Memory Usage
- Cached queries automatically cleaned up after 10 minutes
- No memory leaks from unmounted components
- Typical cache size: 1-5 MB for active session

## Future Enhancements

### Potential Improvements
1. **Form Draft Auto-Save**: Save form state to sessionStorage every 30 seconds
2. **URL State Sync**: Persist filters, sort order, page numbers in URL
3. **Scroll Restoration**: Remember scroll positions when returning to lists
4. **Optimistic Updates**: Show UI changes instantly before server confirms
5. **Prefetching**: Load likely next pages in background

### Custom Persistencefor Specific Features
If certain forms/pages need state persistence, we can add it on a case-by-case basis using the patterns in section #2.

## Troubleshooting

### "My form data disappeared when I switched tabs"
**Expected behavior**. Forms don't auto-save by default. Either complete your form before switching, or request form draft auto-save feature for that specific page.

### "The data is showing old information"
Click the refresh button, or wait - if you've been on another tab, the data will automatically refresh when you return due to `refetchOnWindowFocus: true`.

### "The page loads slowly when I come back"
If more than 10 minutes have passed, the cache was cleared and data needs to be refetched. This is intentional to prevent showing very stale data.

### "I want scroll position to be remembered"
This requires additional implementation. File a feature request if it's important for your workflow.

## Summary

**State Retention = React Query Cache + (Optional) URL/Storage Persistence**

The current implementation provides **excellent data caching** for lists and records. Form inputs and UI state are intentionally not persisted to avoid complexity and potential bugs.

If specific pages need enhanced state persistence, they can be individually upgraded using URL params, sessionStorage, or global state management.
