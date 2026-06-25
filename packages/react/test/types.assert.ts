import { stream, type QoreStream, type ReadonlySignal } from '@qorejs/qore';
import {
  useQoreSignal,
  useQoreSignalSelector,
  useQoreStream,
  useQoreStreamSnapshot,
  useQoreTextStream,
  type QoreReactStream
} from '../src/index.js';

const count = {} as ReadonlySignal<number>;
const countValue: number = useQoreSignal(count);
const evenLabel: 'even' | 'odd' = useQoreSignalSelector(count, (value) => value % 2 === 0 ? 'even' : 'odd');

const answerStream = stream(['hello']);
const answerSnapshot: QoreReactStream<string, string> = useQoreStreamSnapshot(answerStream, {
  initialValue: ''
});
const answerValue: string = answerSnapshot.value;
const answerStatus: string = answerSnapshot.status;
const answerChunks: string[] = answerSnapshot.chunks;

const managed = useQoreStream<string, string>(() => stream(['a', 'b']), [], {
  initialValue: '',
  enabled: true
});
const managedStream: QoreStream<string, string> | null = managed.stream;

const text = useQoreTextStream(() => ['a', 'b'], [], '');
const textValue: string = text.value;

void countValue;
void evenLabel;
void answerValue;
void answerStatus;
void answerChunks;
void managedStream;
void textValue;
