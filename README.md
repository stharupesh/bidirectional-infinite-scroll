# bidirectional-infinite-scroll

A bi-directional infinite scroll React component for rendering large datasets in two-page windows.

## Install
```bash
npm i bidirectional-infinite-scroll
```

## Usage
```tsx
import { BidirectionalInfiniteScroll } from "bidirectional-infinite-scroll";

export default function Demo() {
  return (
    <BidirectionalInfiniteScroll
      data={[...Array(1000).keys()]}
      pageSize={20}
      renderPage={(pageData, pageIndex) => (
        <div key={pageIndex}>{pageData.map((i) => <div key={i}>{i}</div>)}</div>
      )}
    />
  );
}
```
