# Format Utilities Guide

Complete reference for all formatting utility functions in `src/utils/format.ts`

## 📚 Function Categories

### 1. Query String Helpers

#### `parseQueryString(queryString: string)`
Parse URL query string into an object.

```typescript
import { parseQueryString } from '@/utils/format';

const query = parseQueryString('?type=test&status=approved');
// Result: { type: 'test', status: 'approved' }

// Also works without ?
const query2 = parseQueryString('type=test&status=approved');
// Result: { type: 'test', status: 'approved' }
```

#### `stringifyQueryString(params: Record<string, any>)`
Convert object to query string.

```typescript
import { stringifyQueryString } from '@/utils/format';

const qs = stringifyQueryString({ type: 'test', status: 'approved' });
// Result: 'type=test&status=approved'
```

#### `buildUrl(baseUrl: string, params: Record<string, any>)`
Build complete URL with query parameters.

```typescript
import { buildUrl } from '@/utils/format';

const url = buildUrl('http://localhost:3000/records', {
  type: 'test',
  status: 'approved',
});
// Result: 'http://localhost:3000/records?type=test&status=approved'
```

---

### 2. Text Formatting

#### `formatEnumValue(text: string)`
Convert enum/kebab-case to readable text.

```typescript
import { formatEnumValue } from '@/utils/format';

formatEnumValue('pending-review'); // "Pending Review"
formatEnumValue('test-result');    // "Test Result"
```

#### `camelToTitleCase(text: string)`
Convert camelCase to Title Case.

```typescript
import { camelToTitleCase } from '@/utils/format';

camelToTitleCase('alcoa_qa_db');   // "Alcoa Qa Db"
camelToTitleCase('testResult');    // "Test Result"
```

#### `toKebabCase(text: string)`
Convert text to kebab-case.

```typescript
import { toKebabCase } from '@/utils/format';

toKebabCase('Test Result');        // "test-result"
toKebabCase('PendingReview');      // "pending-review"
```

#### `truncateText(text: string, maxLength: number, ellipsis?: string)`
Truncate text with ellipsis.

```typescript
import { truncateText } from '@/utils/format';

truncateText('This is a long description', 10);
// Result: "This is..."

truncateText('This is a long description', 10, '…');
// Result: "This is…"
```

---

### 3. Number Formatting

#### `formatNumber(value: number, locale?: string)`
Format number with thousands separator.

```typescript
import { formatNumber } from '@/utils/format';

formatNumber(1000);      // "1,000"
formatNumber(1000000);   // "1,000,000"
formatNumber(1000, 'de-DE'); // "1.000" (German format)
```

#### `formatBytes(bytes: number, decimals?: number)`
Format bytes to human-readable size.

```typescript
import { formatBytes } from '@/utils/format';

formatBytes(1024);           // "1 KB"
formatBytes(1024 * 1024);    // "1 MB"
formatBytes(5368709120, 2);  // "5 GB"
```

#### `formatPercentage(value: number, decimals?: number)`
Format decimal as percentage.

```typescript
import { formatPercentage } from '@/utils/format';

formatPercentage(0.98);      // "98%"
formatPercentage(0.9876, 2); // "98.76%"
```

---

### 4. JSON/Data Formatting

#### `formatJSON(data: any, spaces?: number)`
Pretty-print JSON with indentation.

```typescript
import { formatJSON } from '@/utils/format';

const user = { name: 'John', role: 'admin' };
console.log(formatJSON(user));
// Output:
// {
//   "name": "John",
//   "role": "admin"
// }
```

#### `safeJSONParse<T>(jsonString: string, fallback: T)`
Safely parse JSON with fallback.

```typescript
import { safeJSONParse } from '@/utils/format';

const data = safeJSONParse('{"name":"John"}', {});
// Result: { name: 'John' }

const bad = safeJSONParse('not valid json', {});
// Result: {} (fallback)
```

#### `flattenObject(obj: any, prefix?: string)`
Flatten nested object keys.

```typescript
import { flattenObject } from '@/utils/format';

const nested = {
  user: {
    name: 'John',
    profile: { role: 'admin' }
  }
};

flattenObject(nested);
// Result: {
//   'user.name': 'John',
//   'user.profile.role': 'admin'
// }
```

---

### 5. Record/Array Formatting

#### `groupBy<T>(array: T[], key: keyof T)`
Group array elements by property.

```typescript
import { groupBy } from '@/utils/format';

const records = [
  { id: 1, status: 'approved' },
  { id: 2, status: 'pending' },
  { id: 3, status: 'approved' }
];

groupBy(records, 'status');
// Result: {
//   'approved': [{ id: 1, ... }, { id: 3, ... }],
//   'pending': [{ id: 2, ... }]
// }
```

#### `countBy<T>(array: T[], key: keyof T)`
Count occurrences by property.

```typescript
import { countBy } from '@/utils/format';

const records = [
  { status: 'approved' },
  { status: 'pending' },
  { status: 'approved' }
];

countBy(records, 'status');
// Result: { 'approved': 2, 'pending': 1 }
```

#### `unique<T>(array: T[], key?: keyof T)`
Remove duplicates from array.

```typescript
import { unique } from '@/utils/format';

unique([1, 2, 2, 3, 3, 3]);
// Result: [1, 2, 3]

const records = [
  { id: 1, name: 'John' },
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' }
];

unique(records, 'id');
// Result: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
```

---

### 6. Validation & Formatting

#### `formatEmail(email: string)`
Validate and format email.

```typescript
import { formatEmail } from '@/utils/format';

formatEmail('  John@EXAMPLE.COM  ');
// Result: 'john@example.com'

formatEmail('invalid.email');
// Result: null
```

#### `isValidUrl(url: string)`
Validate URL.

```typescript
import { isValidUrl } from '@/utils/format';

isValidUrl('http://localhost:3000'); // true
isValidUrl('not a url');             // false
```

#### `formatPhoneNumber(phone: string)`
Format phone number.

```typescript
import { formatPhoneNumber } from '@/utils/format';

formatPhoneNumber('5551234567');     // "(555) 123-4567"
formatPhoneNumber('15551234567');    // "+1 (555) 123-4567"
```

---

## 🎯 Usage Example in Components

```typescript
import { 
  parseQueryString, 
  formatEnumValue, 
  truncateText,
  groupBy 
} from '@/utils/format';

export function MyComponent() {
  // Parse query params
  const params = parseQueryString(window.location.search);

  // Format record type for display
  const typeDisplay = formatEnumValue(record.type);

  // Truncate long descriptions
  const shortDesc = truncateText(record.description, 50);

  // Group records by status
  const grouped = groupBy(records, 'status');

  return (
    <div>
      <h3>{typeDisplay}</h3>
      <p>{shortDesc}</p>
    </div>
  );
}
```

---

## 📦 Import Options

```typescript
// Individual imports (recommended)
import { parseQueryString, formatEnumValue } from '@/utils/format';

// Default export
import format from '@/utils/format';

format.parseQueryString('...');
format.formatEnumValue('...');
```

---

## ✅ All Functions Reference

| Category | Functions |
|----------|-----------|
| **Query String** | parseQueryString, stringifyQueryString, buildUrl |
| **Text** | formatEnumValue, camelToTitleCase, toKebabCase, truncateText |
| **Numbers** | formatNumber, formatBytes, formatPercentage |
| **JSON/Data** | formatJSON, safeJSONParse, flattenObject |
| **Records/Arrays** | groupBy, countBy, unique |
| **Validation** | formatEmail, isValidUrl, formatPhoneNumber |
