# Benchmarks

Qore benchmarks compare runtime paths, not marketing claims.

The current browser benchmark compares:

- `Qore stream = signal`: mount the transcript shell once and advance the same live text node as chunks arrive
- `Snapshot rerender baseline`: rebuild the transcript shell from a snapshot string on every chunk

Both paths use the same transcript history, chunk list, and final answer.

Reported metrics include:

- first mutation time
- mutation records
- added nodes
- removed nodes
- rewritten markup bytes
- total duration

The benchmark does not claim that Qore is categorically faster than React. It shows that Qore avoids snapshot-style transcript rewrites on the streaming hot path.

Run it locally:

```bash
npm run test:benchmark
```
