import Box from "@mui/material/Box";
import * as React from "react";
import { createRoot } from "react-dom/client";

const style: React.CSSProperties = {
    display: "inline-block",
    fontSize: "18px",
    background: "gold",
    padding: "2px 10px",
    borderRadius: "24px",
    margin: "0 4px",
};

const Label: React.FC<React.PropsWithChildren> = ({ children }) => {
    return <div style={style}>{children}</div>;
};

const isCustomComponent = (node: Node): boolean => {
    return (
        node instanceof HTMLElement && node.getAttribute("contenteditable") === "false"
    );
};

const countChars = (nodes: Node[], target: Node, count: number = 0): number => {
    const [head, ...tail] = nodes;
    if (head == null) return count;
    if (head === target) {
        if (target.nodeName === "DIV") return count + 1;
        return count;
    }
    if (isCustomComponent(head)) return countChars(tail, target, count + 1);
    if (head.nodeType === Node.TEXT_NODE)
        return countChars(tail, target, count + (head.textContent?.length ?? 0));
    return countChars([...Array.from(head.childNodes), ...tail], target, count);
};

const getCaretPosition = (
    editor: HTMLElement,
    text: string,
    oldBlocks: Block[]
): number => {
    const selection = document.getSelection();
    if (selection == null) return 0;

    let focusOffset = selection.focusOffset;
    const oldLabelBlocks = oldBlocks.filter((b) => b.type === "label");
    const newLabelBlocks = parse(text, 0).filter((b) => b.type === "label");
    if (oldLabelBlocks.length < newLabelBlocks.length) {
        const createdBlock = newLabelBlocks.find((newLabelBlock) => {
            const rawLabelBlockEnd = newLabelBlock.start + newLabelBlock.text.length;
            return rawLabelBlockEnd === focusOffset;
        });
        if (createdBlock) {
            const adjustment = createdBlock.text.length - 1;
            focusOffset -= adjustment;
        } else {
            focusOffset -= 1;
        }
    }

    const target = selection.focusNode;
    if (target == null || editor === target) return 0;

    return countChars([editor], target) + focusOffset;
};

const moveCaret = (editor: HTMLElement, caretPosition: number): void => {
    const selection = document.getSelection();
    if (selection == null) return;

    const findNode = (nodes: Node[], count: number): [Node, number] | [] => {
        const [head, ...tail] = nodes;
        if (head == null) return [];

        if (head.hasChildNodes() && !isCustomComponent(head))
            return findNode([...Array.from(head.childNodes), ...tail], count);
        const length =
            isCustomComponent(head) || head.nodeName === "BR"
                ? 1
                : head.textContent?.length ?? 0;
        const addedCount = count + length;
        const diff = addedCount - caretPosition;
        if (0 <= diff) return [head, diff];
        return findNode(tail, addedCount);
    };

    const [targetNode, diff] = findNode([editor], 0);
    if (targetNode == null || diff == null) return;

    const range = document.createRange();
    const offset = Math.max((targetNode.textContent?.length ?? 0) - diff, 0);
    if (isCustomComponent(targetNode)) {
        range.setStartAfter(targetNode);
    } else {
        range.setStart(targetNode, offset);
    }
    selection.removeAllRanges();
    selection.addRange(range);
};

type Block = {
    type: "normal" | "label";
    text: string;
    start: number;
};

const parse = (text: string, start: number, blocks: Block[] = []): Block[] => {
    if (text.length === 0) return blocks;

    const startIndex = text.indexOf("[");
    if (startIndex < 0) return [...blocks, { type: "normal", text, start }];

    const endIndex = text.indexOf("]", startIndex);
    if (endIndex < 0) return [...blocks, { type: "normal", text, start }];

    let mostNearStartIndex = startIndex;
    while (true) {
        const tmpStartIndex = text.indexOf("[", mostNearStartIndex + 1);
        if (tmpStartIndex < 0 || endIndex < tmpStartIndex) break;
        mostNearStartIndex = tmpStartIndex;
    }

    const normalText = text.substring(0, mostNearStartIndex);
    const labelText = text.substring(mostNearStartIndex, endIndex + 1);
    const remainingText = text.substring(endIndex + 1);
    return parse(remainingText, endIndex + 1, [
        ...blocks,
        { type: "normal", text: normalText, start },
        { type: "label", text: labelText, start: mostNearStartIndex },
    ]);
};

const toHtml = (blocks: Block[]): string => {
    return blocks
        .map((block) => {
            if (block.type === "normal") {
                return `<span>${block.text}</span>`;
            }
            return `<span contenteditable="false" class="label" data-text="${block.text}"></span>`;
        })
        .join("");
};

export const Editor: React.FC = () => {
    const inputRef = React.useRef<HTMLDivElement>(null);
    const [text, setText] = React.useState<string>("");
    const [blocks, setBlocks] = React.useState<Block[]>([]);
    const [isComposing, setIsComposing] = React.useState<boolean>(false);
    const [caretPosition, setCaretPosition] = React.useState<number>(0);
    const [caretVisible, setCaretVisible] = React.useState<boolean>(false);
    const [caretCoords, setCaretCoords] = React.useState<{ left: number; top: number }>({
        left: 0,
        top: 0,
    });

    // キャレットの位置を更新する関数
    const updateCaretCoords = (): void => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const editorRect = inputRef.current?.getBoundingClientRect();
            if (editorRect) {
                setCaretCoords({
                    left: rect.left - editorRect.left,
                    top: rect.top - editorRect.top + rect.height,
                });
                setCaretVisible(true); // キャレットが消えないように明示的に表示
            }
        }
    };

    React.useEffect(() => {
        const editor = inputRef.current;
        if (editor && !isComposing) {
            const newBlocks = parse(text, 0);
            editor.innerHTML = toHtml(newBlocks);
            document.querySelectorAll(".label").forEach((label) => {
                const text = label.getAttribute("data-text");
                if (text) createRoot(label).render(<Label>{text}</Label>);
            });
            moveCaret(editor, caretPosition);
            setBlocks(newBlocks);
            // ラベル更新後にキャレットの位置と表示を再設定
            setTimeout(() => {
                updateCaretCoords();
            }, 0); // DOM更新後に実行
        }
    }, [text, isComposing]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>): void => {
        if (!isComposing) {
            const text = e.currentTarget.innerText;
            const newCaretPosition = getCaretPosition(e.currentTarget, text, blocks);
            console.log(newCaretPosition);
            setCaretPosition(newCaretPosition);
            setText(text);
            setCaretVisible(true);
            updateCaretCoords();
        }
    };

    const handleBlur = (): void => {
        setCaretVisible(true); // フォーカスが外れてもキャレットを表示
    };

    const handleCompositionStart = (): void => {
        setIsComposing(true);
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>): void => {
        const text = e.currentTarget.innerText;
        const newCaretPosition = getCaretPosition(e.currentTarget, text, blocks);
        setIsComposing(false);
        setCaretPosition(newCaretPosition);
        setText(text);
        setCaretVisible(true);
        updateCaretCoords();
    };

    const handleSelectionChange = (): void => {
        if (document.activeElement === inputRef.current) {
            updateCaretCoords();
        }
    };

    React.useEffect(() => {
        document.addEventListener("selectionchange", handleSelectionChange);
        return () => {
            document.removeEventListener("selectionchange", handleSelectionChange);
        };
    }, []);

    return (
        <Box
            sx={{
                border: "1px solid #ccc",
                padding: "8px",
                borderRadius: "4px",
                minHeight: "40px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                cursor: "text",
                position: "relative",
            }}
            onClick={() => inputRef.current?.focus()}
        >
            <div
                ref={inputRef}
                suppressContentEditableWarning
                style={{
                    outline: "none",
                    flexGrow: 1,
                    maxWidth: "100%",
                }}
                onInput={handleInput}
                onBlur={handleBlur}
                contentEditable
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
            />
            {caretVisible && (
                <span
                    style={{
                        position: "absolute",
                        width: "50px",
                        height: "80px",
                        backgroundColor: "black",
                        animation: "blink 0.8s infinite",
                        pointerEvents: "none",
                        left: caretCoords.left,
                        top: caretCoords.top,
                    }}
                />
            )}
            <style>
                {`
          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}
            </style>
        </Box>
    );
};