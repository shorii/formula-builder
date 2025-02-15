import Box from "@mui/material/Box";
import * as React from "react";

const getCaretPosition = (editor: HTMLElement): number => {
    const selection = document.getSelection();
    if (!selection) return 0;

    const target = selection.focusNode;
    const countChars = (nodes: Node[], count: number): number => {
        const [head, ...tail] = nodes;
        if (!head || head === target) return count;
        if (head.nodeType === Node.TEXT_NODE) {
            return countChars(tail, count + (head.textContent?.length ?? 0));
        }
        return countChars([...Array.from(head.childNodes), ...tail], count);
    };
    return countChars([editor], 0) + selection.focusOffset;
};

const moveCaret = (editor: HTMLElement, caretPosition: number) => {
    const selection = document.getSelection();
    if (!selection) return;

    const findNode = (nodes: Node[], count: number): [Node, number] | [] => {
        const [head, ...tail] = nodes;
        if (!head) return [];
        if (head.hasChildNodes()) {
            return findNode([...Array.from(head.childNodes), ...tail], count);
        }
        const addedCount = count + (head.textContent?.length ?? 0);
        const diff = addedCount - caretPosition;
        if (0 <= diff) return [head, diff];
        return findNode(tail, addedCount);
    };

    const [targetNode, diff] = findNode([editor], 0);
    if (!targetNode || diff == null) return;

    const range = document.createRange();
    range.setStart(targetNode, targetNode.textContent!.length - diff);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
};

export const Editor = () => {
    const inputRef = React.useRef<HTMLDivElement>(null);
    const [html, setHtml] = React.useState("");
    const [isComposing, setIsComposing] = React.useState(false);
    const [caretPosition, setCaretPosition] = React.useState(0);

    React.useEffect(() => {
        const editor = inputRef.current;
        if (editor && !isComposing) {
            editor.innerHTML = html; // Reactの再レンダリングを防ぐ
            moveCaret(editor, caretPosition);
        }
    }, [html, isComposing]);

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        if (!isComposing) {
            setCaretPosition(getCaretPosition(e.currentTarget));
            setHtml(e.currentTarget.innerHTML);
        }
    };

    const handleCompositionStart = () => {
        setIsComposing(true);
    };

    const handleCompositionEnd = (e: React.CompositionEvent<HTMLDivElement>) => {
        const newCaretPosition = getCaretPosition(e.currentTarget);
        setIsComposing(false);
        setCaretPosition(newCaretPosition);
        setHtml(e.currentTarget.innerHTML);
    };

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
                contentEditable
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
            />
        </Box>
    );
};