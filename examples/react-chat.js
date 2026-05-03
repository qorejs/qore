// @ts-nocheck
import { renderMarkdown } from './render-markdown.js';
// Keep the same prompts as the Qore demo so the comparison stays apples-to-apples.
const presets = [
    '为什么 stream 应该直接是 signal？',
    '给我一个最小 AI 聊天界面',
    'Qore 为什么不是又一个 UI 库？'
];
// This comparison sample mirrors the Qore demo while keeping the React mental model explicit.
export function Chat() {
    const [input, setInput] = useState(presets[0]);
    const feedRef = useRef(null);
    const { messages, sendMessage, status, stop } = useChat();
    // Keep the newest streamed message in view whenever data or status changes.
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages, status]);
    // Derive render-ready cards from the SDK message shape before the view renders them.
    const cards = useMemo(() => messages.map((message, index) => {
        const content = (message.parts ?? [])
            .filter((part) => part.type === 'text')
            .map((part) => part.text ?? '')
            .join('');
        return {
            id: message.id,
            role: message.role,
            live: status === 'streaming' && index === messages.length - 1 && message.role === 'assistant',
            html: renderMarkdown(content)
        };
    }), [messages, status]);
    // Submit the current prompt through the SDK and clear the input for the next turn.
    const submit = async (event) => {
        event.preventDefault();
        const text = input.trim();
        if (!text) {
            return;
        }
        setInput('');
        await sendMessage({ text });
    };
    return {
        shell: 'React / Vercel AI SDK',
        presets,
        input,
        status,
        stop,
        feedRef,
        cards,
        submit,
        setInput
    };
}
