export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => 
      typeof item === 'object' && item !== null ? sanitizeObject(item) : item
    );
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null && !value.toDate && !value.seconds) {
        // Skip Firestore Timestamp objects (they have toDate and seconds properties)
        acc[key] = Array.isArray(value) 
          ? value.map(item => typeof item === 'object' && item !== null ? sanitizeObject(item) : item)
          : sanitizeObject(value);
      } else {
        acc[key] = value;
      }
    }
    return acc;
  }, {} as Record<string, any>);
}