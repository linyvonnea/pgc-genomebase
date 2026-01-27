# Catalog Management System

## Overview
The Catalog Management System provides a centralized interface for managing dropdown options and reference data used throughout the application, specifically for project forms.

## What Can Be Managed

The system manages five categories of data:

1. **Sending Institutions** - Organizations sending project requests
2. **Funding Categories** - Types of funding (External, In-House)
3. **Funding Institutions** - Specific institutions providing funding
4. **Service Requested** - Services offered by the organization
5. **Personnel Assigned** - Staff members who can be assigned to projects

## How to Access

Navigate to: **Admin Panel → Catalog Settings**

Or visit: `/admin/catalog-settings`

## Features

### Adding New Items
1. In each catalog section, type the new item name in the input field
2. Click the "Add" button or press Enter
3. The item will be added with "Active" status by default

### Editing Items
1. Click the pencil icon (✏️) next to any item
2. Modify the text in the input field
3. Click the checkmark (✓) to save or X to cancel
4. Press Enter to save or Escape to cancel

### Deleting Items
1. Click the trash icon (🗑️) next to any item
2. Confirm the deletion in the popup dialog
3. The item will be permanently removed

### Activating/Deactivating Items
1. Click the X icon to deactivate an active item
2. Click the checkmark icon to activate an inactive item
3. Inactive items are:
   - Grayed out in the list
   - Marked with an "Inactive" badge
   - Not shown in form dropdowns
   - Still preserved in the database (soft delete)

### Reordering Items (Drag & Drop)
1. Click and hold the grip icon (⠿) on any item
2. Drag the item to its new position
3. Release to save the new order
4. Items appear in forms in the order you set

## Technical Implementation

### Data Storage
- **Collection**: `settings`
- **Document ID**: `project-catalogs`
- **Structure**: Each catalog type is stored as an array of items with:
  - `id`: Unique identifier
  - `value`: Display text
  - `order`: Sort position
  - `isActive`: Visibility flag
  - `createdAt`: Creation timestamp
  - `updatedAt`: Last modification timestamp

### API/Service Functions

```typescript
// Get all catalogs
getCatalogSettings(): Promise<CatalogSettings>

// Get specific catalog
getCatalog(type: CatalogType): Promise<CatalogItem[]>

// Get active items only (for forms)
getActiveCatalogItems(type: CatalogType): Promise<string[]>

// Add new item
addCatalogItem(type: CatalogType, value: string): Promise<void>

// Update existing item
updateCatalogItem(type: CatalogType, itemId: string, updates: Partial<CatalogItem>): Promise<void>

// Delete item (soft delete)
deleteCatalogItem(type: CatalogType, itemId: string): Promise<void>

// Reorder items
reorderCatalogItems(type: CatalogType, itemIds: string[]): Promise<void>
```

### Files Created
1. `src/types/CatalogSettings.ts` - TypeScript interfaces
2. `src/services/catalogSettingsService.ts` - Service layer functions
3. `src/app/admin/catalog-settings/page.tsx` - Management UI
4. Updated `src/components/layout/AdminSidebar.tsx` - Added navigation link

## Usage in Forms

To use the dynamic catalog data in your forms:

```typescript
import { getActiveCatalogItems } from "@/services/catalogSettingsService";

// In your component
const [serviceOptions, setServiceOptions] = useState<string[]>([]);

useEffect(() => {
  getActiveCatalogItems("serviceRequested").then(setServiceOptions);
}, []);

// Then use serviceOptions in your select/dropdown
```

## Best Practices

1. **Use Deactivate Instead of Delete**: Deactivating items preserves historical data while hiding them from new forms
2. **Order Matters**: Arrange frequently used items at the top
3. **Naming Convention**: Use clear, consistent naming for items
4. **Regular Cleanup**: Periodically review and deactivate unused items
5. **Backup Before Major Changes**: Export data before bulk modifications

## Default Values

The system initializes with these defaults on first run:

**Sending Institutions:**
- UP System
- SUC/HEI
- Government
- Private/Local
- International
- N/A

**Funding Categories:**
- External
- In-House

**Service Requested:**
- Laboratory Services
- Retail Services
- Equipment Use
- Bioinformatics Analysis
- Training

**Funding Institutions:** Empty (add as needed)
**Personnel Assigned:** Empty (add as needed)

## Permissions

Only admin users with access to the admin panel can manage catalog settings. Regular users only see the active items in forms.

## Future Enhancements (Optional)

- Export/Import catalog data as JSON/CSV
- Bulk upload from spreadsheet
- Audit trail for catalog changes
- Multi-language support for catalog items
- Custom validation rules per catalog type
