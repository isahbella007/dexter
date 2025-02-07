import { marked } from 'marked';

interface Decoration {
    type: string;
    fontWeightValue?: number;
    linkData?: {
        link: {
            url: string;
            target?: string;
            rel?: {
                noreferrer?: boolean;
            };
        };
    };
}

interface TextNode {
    type: "TEXT";
    id?: string;
    textData: {
        text: string;
        decorations: Decoration[];
        linkData?: {
            link: {
                url: string;
                target?: string;
            };
        };
    };
}

export function markdownToWixContent(markdown: string): any {
    const tokens = marked.lexer(markdown);
    
    const nodes = tokens.map(token => {
        switch (token.type) {
            case 'heading':
                return {
                    type: "HEADING",
                    id: generateId(),
                    nodes: [createTextNode(token.text, getHeadingDecorations(token.depth))],
                    headingData: {
                        level: token.depth
                    }
                };
                
            case 'paragraph':
                return {
                    type: "PARAGRAPH",
                    id: generateId(),
                    nodes: parseInlineContent(token.text),
                    paragraphData: {}
                };

            case 'image':
                if(isYoutubeLink(token.href)) {
                    return createYoutubeNode(token.href);
                }
                return {
                    type: "IMAGE",
                    id: generateId(),
                    imageData: {
                        src: token.href,
                        altText: token.text,
                        width: null,
                        height: null,
                        alignment: "CENTER"
                    }
                };

            case 'table':
                return {
                    type: "TABLE",
                    id: generateId(),
                    tableData: {
                        rows: token.rows.map((row: any[]) => ({
                            cells: row.map(cell => ({
                                type: "TEXT",
                                textData: {
                                    text: cell,
                                    decorations: []
                                },
                                cellData: {
                                    borderColor: "#000000",
                                    backgroundColor: "#FFFFFF"
                                }
                            }))
                        }))
                    }
                };

            case 'list':
                return {
                    type: "LIST",
                    id: generateId(),
                    listData: {
                        type: token.ordered ? "ORDERED" : "UNORDERED",
                        items: token.items.map((item: { text: string; }) => ({
                            type: "LIST_ITEM",
                            id: generateId(),
                            nodes: parseInlineContent(item.text)
                        }))
                    }
                };

            case 'code':
                return {
                    type: "CODE",
                    id: generateId(),
                    codeData: {
                        code: token.text,
                        language: token.lang || 'plaintext'
                    }
                };

            case 'blockquote':
                return {
                    type: "BLOCKQUOTE",
                    id: generateId(),
                    nodes: parseInlineContent(token.text),
                    blockquoteData: {
                        citation: ""
                    }
                };

            default:
                console.warn(`Unsupported block element: ${token.type}`);
                return null;
        }
    }).filter(node => node !== null);

    return { nodes };
}

function createTextNode(text: string, decorations: Decoration[] = []): TextNode {
    return {
        type: "TEXT",
        id: "",
        textData: {
            text,
            decorations: decorations.length > 0 ? decorations.map(d => ({
                ...d,
                ...(d.type === 'LINK' && d.linkData ? { 
                    linkData: {

                        link: {
                            ...d.linkData.link,
                            target: d.linkData.link.target || 'BLANK',
                            rel: { noreferrer: true }
                        }
                    }
                } : {})
            })) : []
        }
    };

}

function parseInlineContent(text: string, parentDecorations: Decoration[] = []): any[] {
    const inlineTokens = marked.Lexer.lexInline(text);
    const nodes: any[] = [];
    let currentDecorations: Decoration[] = [...parentDecorations];
    let currentText = '';

    const flushCurrentText = () => {
        if (currentText) {
            nodes.push(createTextNode(currentText, currentDecorations));
            currentText = '';
        }
    };

    inlineTokens.forEach(token => {
        switch (token.type) {
            case 'text':
                currentText += token.text;
                break;

            case 'link':
                flushCurrentText();
                const linkDecoration: Decoration = {
                    type: "LINK",
                    linkData: {
                        link: {
                            url: token.href,
                            target: "BLANK",
                            rel: { noreferrer: true }
                        }
                    }
                };
                const linkContent = parseInlineContent(token.text, [...parentDecorations, linkDecoration]);
                nodes.push(...linkContent);
                break;

            case 'strong':
                flushCurrentText();
                currentDecorations = [...currentDecorations, { type: "BOLD", fontWeightValue: 700 }];
                currentText += token.text;
                flushCurrentText();
                currentDecorations = currentDecorations.filter(d => d.type !== "BOLD");
                break;

            case 'em':
                flushCurrentText();
                currentDecorations = [...currentDecorations, { type: "ITALIC" }];
                currentText += token.text;
                flushCurrentText();
                currentDecorations = currentDecorations.filter(d => d.type !== "ITALIC");
                break;

            case 'codespan':
                flushCurrentText();
                currentDecorations = [...currentDecorations, { type: "CODE" }];
                currentText += token.text;
                flushCurrentText();
                currentDecorations = currentDecorations.filter(d => d.type !== "CODE");
                break;

            case 'del':
                flushCurrentText();
                currentDecorations = [...currentDecorations, { type: "STRIKETHROUGH" }];
                currentText += token.text;
                flushCurrentText();
                currentDecorations = currentDecorations.filter(d => d.type !== "STRIKETHROUGH");
                break;

            case 'underline':
                flushCurrentText();
                currentDecorations = [...currentDecorations, { type: "UNDERLINE" }];
                currentText += token.text;
                flushCurrentText();
                currentDecorations = currentDecorations.filter(d => d.type !== "UNDERLINE");
                break;

            default:
                console.warn(`Unsupported inline element: ${token.type}`);
                break;
        }
    });

    flushCurrentText();
    return nodes;
}

function createYoutubeNode(url: string) {
    const videoId = getYoutubeId(url);
    return {
        type: "VIDEO",
        id: generateId(),
        videoData: {
            src: {
                url: `https://www.youtube.com/embed/${videoId}`,
                width: 640,
                height: 360
            },
            thumbnail: {
                url: `https://img.youtube.com/vi/${videoId}/0.jpg`
            }
        }
    };
}

function getHeadingDecorations(depth: number): Decoration[] {
    return depth === 1 ? [{ type: "BOLD", fontWeightValue: 700 }, { type: "ITALIC" }] : [{ type: "BOLD", fontWeightValue: 700 }];
}


function isYoutubeLink(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
}

function getYoutubeId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}