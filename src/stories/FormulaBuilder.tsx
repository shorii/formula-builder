import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import * as React from "react";


export type Placeholder = {
    placeholder: string;
    value: number;
}

export type Formula = {
    statement: string;
    placeholders: Placeholder[];
}

export type FormulaBuilderProps = {
    value: Formula;
};

export const FormulaBuilder = (props: FormulaBuilderProps) => {
    const { value } = props;
    const [tokens, setTokens] = React.useState<Token[]>(() => {
        const parser = new StatementParser(value.statement);
        const statement: Statement = parser.parse();
        return statement.tokens
    });
    const inputRef = React.useRef<HTMLDivElement>(null);

    const handleInput = (event: React.FormEvent<HTMLDivElement>) => {
        if (event.currentTarget.id === "entire") {
            let numberText = "";
            for (const comp of event.currentTarget.children) {
                if (comp.className.includes("MuiChip-root")) {
                    numberText += `$\{${comp.textContent}\}`;
                    continue;
                }
                numberText += comp.textContent;
            }
            console.log(numberText);
            const parser = new StatementParser(numberText);
            try {
                const statement: Statement = parser.parse()
                setTokens(statement.tokens);
            } catch (e) {
                console.log(e);
            }
        }
    };

    const handleClick = () => {
        console.log(tokens);
    };

    return (
        <>
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
                <span
                    id="entire"
                    ref={inputRef}
                    suppressContentEditableWarning
                    onInput={handleInput}
                    style={{
                        outline: "none",
                        flexGrow: 1,
                    }}
                >
                    <span
                        ref={inputRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        style={{
                            outline: "none",
                            flexGrow: 1,
                        }}
                    />
                    {tokens.map((token, index) => {
                        if (token.type === TokenType.VarName) {
                            return (
                                <>
                                    <Chip
                                        key={index}
                                        label={token.name}
                                        sx={{ margin: "2px" }}
                                    />
                                </>
                            );
                        } else {
                            return (
                                <span
                                    ref={inputRef}
                                    key={index}
                                    contentEditable
                                    suppressContentEditableWarning
                                    style={{
                                        outline: "none",
                                        flexGrow: 1,
                                    }}
                                >
                                    {
                                        token.type === TokenType.Plus ? "+" :
                                            token.type === TokenType.Minus ? "-" :
                                                token.type === TokenType.Multi ? "*" :
                                                    token.type === TokenType.Divi ? "/" :
                                                        token.type === TokenType.Lparen ? "(" :
                                                            token.type === TokenType.Rparen ? ")" :
                                                                token.type === TokenType.Number ? `${token.value}` : ""
                                    }
                                </span>
                            );
                        }
                    })}
                    <span
                        id="cursor"
                        ref={inputRef}
                        contentEditable
                        suppressContentEditableWarning
                        onInput={handleInput}
                        style={{
                            outline: "none",
                            flexGrow: 1,
                        }}
                    />
                </span>
            </Box>
            <Button onClick={handleClick}>確認</Button>
        </>
    );
}


enum TokenType {
    VarName = 'VarName',
    Plus = 'Plus',
    Minus = 'Minus',
    Multi = 'Multi',
    Divi = 'Divi',
    Number = 'Number',
    Lparen = 'Lparen',
    Rparen = 'Rparen',
    EOS = 'EOS'
};

interface Renderable {
    render: () => React.ReactElement;
}

class Token implements Renderable {
    type: TokenType;
    value?: number;
    name?: string;

    constructor(props: { type: TokenType; value?: number; name?: string }) {
        const { type, value, name } = props;
        this.type = type;
        this.value = value;
        this.name = name;
    }

    render(): React.ReactElement {
        if (this.type === TokenType.VarName) {
        }

        return <></>;
    }
}


class Statement implements Renderable {
    tokens: Token[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    render(): React.ReactElement {
        return (
            <>{this.tokens.map(token => token.render())}</>
        );
    }
}

class StatementParser {
    currentPointer: number;
    text: string;

    constructor(text: string) {
        this.currentPointer = 0;
        this.text = text;
    }

    parse(): Statement {
        let tokens = [];
        let token = this.getToken();
        while (token.type !== TokenType.EOS) {
            console.log("heavy");
            tokens.push(token);
            token = this.getToken();
        }
        return new Statement(tokens);
    }

    getToken(): Token {
        let char = this.getChar();
        console.log(char);
        if (char === undefined) {
            return new Token({
                type: TokenType.EOS,
            });
        }
        if (this.isNumber(char)) {
            let numberText = '';
            while (this.isNumber(char)) {
                numberText += char;
                char = this.getChar();
            }
            this.currentPointer -= 1;
            return new Token({
                type: TokenType.Number,
                value: parseInt(numberText, 10),
            });
        }
        if (char === "$") {
            if (this.getChar() !== "{") {
                throw Error("Failed to parse variable.")
            }
            let nameText = "";
            let innerNameChar = this.getChar();
            while (innerNameChar !== "}") {
                nameText += innerNameChar;
                innerNameChar = this.getChar();
            }
            return new Token({
                type: TokenType.VarName,
                name: nameText,
            })
        }

        switch (char) {
            case '+':
                return new Token({
                    type: TokenType.Plus
                });
            case '-':
                return new Token({
                    type: TokenType.Minus
                });
            case '*':
                return new Token({
                    type: TokenType.Multi
                });
            case '/':
                return new Token({
                    type: TokenType.Divi
                });
            case '(':
                return new Token({
                    type: TokenType.Lparen
                });
            case ')':
                return new Token({
                    type: TokenType.Rparen
                });
            default:
                throw Error(`Unsupported operator: ${char}`)
        }
    }

    getChar(): string | undefined {
        let char = this.text[this.currentPointer];
        while (/\s/.test(char)) {
            this.currentPointer += 1;
            char = this.text[this.currentPointer];
        }
        this.currentPointer += 1;
        return char;
    }

    isNumber(char: string | undefined): boolean {
        if (char === undefined) {
            return false;
        }
        return /\d+/.test(char);
    }
}