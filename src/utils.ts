interface SEUnit {
  type: 'Unit';
  value: Record<string, never>;
}

interface SEString {
  type: 'String';
  value: string;
}

interface SEInt {
  type: 'Int';
  value: string;
}

interface SEArray<T> {
  type: 'Array';
  value: T[];
}

export interface SETuple {
  type: 'Tuple';
  value: Record<string, SEItem>;
}

type SEItem = SEUnit | SEString | SEInt | SEArray<unknown> | SETuple;
type ExtractSEValue<T extends SEItem> = T extends SEUnit ? null : T['value'];
type ExtractedSEValues = ExtractSEValue<SEItem>;

export function extractSEItemValue(item: SEItem): ExtractedSEValues {
  switch (item.type) {
    case 'Unit':
      return null;
    case 'Tuple':
      return Object.entries(item.value)
        .sort(([aKey], [bKey]) => {
          const a = Number(aKey.slice(1));
          const b = Number(bKey.slice(1));

          return a - b;
        })
        .map(([, tupleItem]) => extractSEItemValue(tupleItem));
    default:
      return item.value;
  }
}
