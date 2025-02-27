# Celigo Javascript Hook Typings

## Installation Instructions
```bash
npn install -D celigo-types
```

## Usage
```typescript
import { EntryPoints } from 'celigo-types';
```

## PreMap Example
```typescript
import { EntryPoints } from 'celigo-types';

const preMap: EntryPoints.preMap<Record, ReturnRecord> = (o: EntryPoints.PreMap.options<Record>): EntryPoints.PreMap.response<ReturnRecord> => {
    return o.data.map((record) => {
        return { data: record };
    });
}
```
