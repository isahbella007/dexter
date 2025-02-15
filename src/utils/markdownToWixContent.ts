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
    const tokens = marked.lexer(markdown, {gfm: true});
    
    const nodes = tokens.map(token => {
        console.log('token =>', token.type)
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
                // Handle paragraphs that might contain images
                const inlineNodes = parseInlineContent(token.text);
                
                // Check if paragraph contains only an image
                const hasOnlyImage = inlineNodes.length === 1 && 
                                  inlineNodes[0].type === "IMAGE";

                return hasOnlyImage 
                    ? inlineNodes[0] // Return image directly
                    : {
                        type: "PARAGRAPH",
                        id: generateId(),
                        nodes: inlineNodes,
                        style: {
                            paddingTop: "12px",
                            paddingBottom: "18px"
                        },
                        paragraphData: {
                            textStyle: {
                                lineHeight: "2"
                            }
                        }
                    };

            case 'image':
                if(isYoutubeLink(token.href)) {
                    return createYoutubeNode(token.href);
                }
                return {
                    type: "IMAGE",
                    id: generateId(),
                    imageData: {
                        containerData: {
                            width: { 
                                size: "CONTENT"
                            },
                            alignment: "CENTER",
                            textWrap: true,
                        },
                        image: { 
                            src: {
                                url: token.href,
                            },
                            width: 5120,
                            height: 3413,
                        },
                        altText: token.text,
                        caption: token.text // Direct caption property
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
                console.log('list =>', token)
                return {
                    type: token.ordered ? "ORDERED_LIST" : "BULLETED_LIST",
                    id: generateId(),
                    nodes: token.items.map((item: { text: string; }) => ({
                        type: "LIST_ITEM",
                        id: generateId(),
                        nodes: [{
                            type: "PARAGRAPH",  // Wix requires paragraph inside list items
                            id: generateId(),
                            nodes: parseInlineContent(item.text)
                        }]
                    })),
                    // Use correct property name based on list type
                    ...(token.ordered ? {
                        orderedListData: {
                            indentation: 0
                        }
                    } : {
                        bulletedListData: {
                            indentation: 0
                        }
                    })
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
            case 'image':  // Handle inline images properly
                flushCurrentText();
                nodes.push({
                    type: "IMAGE",
                    id: generateId(),
                    imageData: {
                        containerData: {
                            width: { size: "CONTENT" },
                            alignment: "CENTER",
                            textWrap: true
                        },
                        image: {
                            src: { url: token.href },
                            width: 5120,
                            height: 3413
                        },
                        altText: token.text,
                        caption: token.text
                    }
                });
                break;
                
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