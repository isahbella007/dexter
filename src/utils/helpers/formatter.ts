export const mainKeywordFormatter = (mainKeyword: string | string[]): string => { 
    return Array.isArray(mainKeyword) ? mainKeyword[0] : mainKeyword
}