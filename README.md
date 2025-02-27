# Celigo Javascript Hook Typings

## Installation Instructions
```bash
npn install -D celigo-types
```

## Usage
```typescript
import { EntryPoints } from 'celig-types';
```

## PreMap Example
```typescript
import { EntryPoints } from 'celig-types';

const preMap: EntryPoints.preMap<unknown, unknown> = (o: EntryPoints.PreMap.options): EntryPoints.PreMap.response => {
    return o.data.map((record) => {
        return { data: record };
    });
}
```
