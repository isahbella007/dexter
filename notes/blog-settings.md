# Blog Post Settings Documentation

## Overview
This document outlines the complete settings structure for the blog post generation system. Each section includes implementation status, features, requirements, and integration details.

## Implementation Categories

### Core Features (Implemented)
- Basic Settings Schema
- Language Selection
- Article Size Configuration
- Structure Elements
- Platform Integration

### Partially Implemented Features
- AI Model Selection
- API Key Management
- SEO Integration
- Content Structure
- Performance Tracking

### Pending Implementation
- Advanced Analytics
- Cost Calculation
- Bulk Generation Settings
- Advanced Platform Features

## Core Settings

### Language Selection
```typescript
interface ILanguageSettings {
    code: string;      // ISO language code
    display: string;   // Display name
    isDefault: boolean;
    region?: string;   // Optional region code
}

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'] as const;
type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];
```

**Status**: ✅ Implemented
- Basic language support
- ISO code validation
- Default language handling

**Pending**:
- Regional variants
- Language-specific validation
- Content style guides

### Article Size
```typescript
enum ArticleType {
    SMALL = 'small',    // 1200-1800 words
    MEDIUM = 'medium',  // 2400-3600 words
    LARGE = 'large'     // 4800-6000 words
}

interface IArticleSize {
    type: ArticleType;
    wordCount: {
        min: number;
        max: number;
    };
    headings: {
        h2: { min: number; max: number; };
        h3: { min: number; max: number; };
    };
    sections: {
        min: number;
        max: number;
        recommended: number;
    };
}
```

**Token Calculations:**
```typescript
const TOKEN_CALCULATIONS = {
    small: { min: 1200, max: 1800, tokens: 2340 },
    medium: { min: 2400, max: 3000, tokens: 3900 },
    large: { min: 4800, max: 6000, tokens: 7800 }
};
```

**Status**: ✅ Implemented
- Size presets
- Word count ranges
- Basic validation

**Pending**:
- Dynamic sizing
- Cost calculation
- Performance optimization

### AI Integration
```typescript
type AIProvider = 'openai' | 'anthropic';
type OpenAIModel = 'gpt-3.5-turbo' | 'gpt-4';
type AnthropicModel = 'claude-3-haiku';

interface IAISettings {
    provider: AIProvider;
    model: OpenAIModel | AnthropicModel;
    temperature: number;
    maxTokens: number;
    apiConfig: {
        useCustomKey: boolean;
        customKeys?: {
            [K in AIProvider]?: string;
        };
        usageMetrics: {
            [K in AIProvider]: {
                tokensUsed: number;
                requestCount: number;
                lastUsed: Date;
                costEstimate: number;
            };
        };
    };
}

interface IModelCapabilities {
    maxTokens: number;
    inputCost: number;
    outputCost: number;
    features: string[];
    contextSize: number;
}

const MODEL_CAPABILITIES: Record<string, IModelCapabilities> = {
    'gpt-3.5-turbo': {
        maxTokens: 4096,
        inputCost: 0.0015,
        outputCost: 0.002,
        features: ['streaming', 'function-calling'],
        contextSize: 16385
    },
    'gpt-4': {
        maxTokens: 8192,
        inputCost: 0.03,
        outputCost: 0.06,
        features: ['streaming', 'function-calling', 'advanced-reasoning'],
        contextSize: 32768
    },
    'claude-3-haiku': {
        maxTokens: 4096,
        inputCost: 0.0025,
        outputCost: 0.0025,
        features: ['streaming', 'function-calling'],
        contextSize: 16385
    }
};
```

### Media Hub Integration

#### AI Image Generation
```typescript
interface IMediaSettings {
    images: {
        enabled: boolean;
        count: number;
        style: ImageStyle;
        sizes: ImageSize[];
        generation: {
            provider: 'dall-e' | 'stable-diffusion' | 'cloudinary';
            style: {
                preset: string;
                custom?: string;
            };
            size: {
                preset: '16:9' | '4:3' | '1:1';
                custom?: {
                    width: number;
                    height: number;
                };
            };
            branding: {
                name?: string;
                guidelines?: string;
            };
        };
    };
    videos: {
        enabled: boolean;
        count: number;
        youtube: {
            search: {
                enabled: boolean;
                relevanceScore: number;
                maxResults: number;
            };
            embed: {
                responsive: boolean;
                width: number;
                height: number;
            };
        };
    };
    layout: {
        autoPlace: boolean;
        spacing: number;
        rules: {
            afterHeadings: boolean;
            maxPerSection: number;
            positions: ('top' | 'middle' | 'bottom')[];
        };
        responsive: {
            mobile: {
                maxWidth: number;
                layout: 'stack' | 'grid';
            };
            desktop: {
                layout: 'inline' | 'float';
                alignment: 'left' | 'right' | 'center';
            };
        };
    };
}
```

### SEO Integration

#### Keyword Management
```typescript
interface ISEOSettings {
    keywords: {
        main: string[];
        secondary: string[];
        analysis: {
            difficulty: number;     // 0-100
            volume: {
                monthly: number;
                trend: number[];
            };
            competition: number;    // 0-1
            cpc: number;
        };
        suggestions: {
            nlpGenerated: string[];
            related: string[];
            questions: string[];
            longTail: string[];
        };
        optimization: {
            density: {
                current: number;
                recommended: number;
            };
            placement: {
                title: boolean;
                description: boolean;
                headings: number;
                firstParagraph: boolean;
            };
        };
    };
    analysis: {
        score: number;
        readability: {
            score: number;
            grade: string;
            suggestions: string[];
        };
        structure: {
            headings: boolean;
            paragraphs: boolean;
            links: boolean;
        };
        meta: {
            title: string;
            description: string;
            canonical?: string;
        };
    };
}
```

### Content Structure
```typescript
interface IStructureSettings {
    layout: {
        hook: {
            enabled: boolean;
            type: HookType;
            length: number;
        };
        sections: {
            enabled: boolean;
            count: number;
            depth: number;
        };
        formatting: {
            elements: IFormattingElements;
            rules: IFormattingRules;
        };
    };
    seo: {
        keywords: {
            density: number;
            placement: KeywordPlacement[];
        };
        headings: {
            structure: HeadingStructure;
            keywords: boolean;
        };
    };
    validation: {
        rules: IValidationRules;
        customRules?: ICustomValidation[];
    };
}

interface IFormattingElements {
    bold: boolean;
    italic: boolean;
    lists: boolean;
    tables: boolean;
    quotes: boolean;
    codeBlocks: boolean;
}

interface IFormattingRules {
    maxConsecutiveLists: number;
    maxTableRows: number;
    maxQuoteLength: number;
    listTypes: ('bullet' | 'numbered' | 'checklist')[];
}

interface IValidationRules {
    sections: {
        minCount: number;
        maxCount: number;
        minLength: number;
        maxLength: number;
    };
    headings: {
        h1: { min: 1, max: 1 };
        h2: { min: 2, max: 12 };
        h3: { min: 0, max: 5 };
    };
    paragraphs: {
        minLength: number;
        maxLength: number;
        maxConsecutive: number;
    };
}
```

### Platform Integration
```typescript
interface IPlatformSettings {
    wordpress?: IWordPressConfig;
    wix?: IWixConfig;
    shopify?: IShopifyConfig;
    custom?: ICustomPlatformConfig;
}

interface IWordPressConfig {
    siteUrl: string;
    apiKey: string;
    options: {
        status: 'draft' | 'publish';
        categories: string[];
        tags: string[];
        featured: boolean;
        allowComments: boolean;
    };
}

interface IWixConfig {
    siteId: string;
    accessToken: string;
    options: {
        locale: string;
        collection: string;
        tags: string[];
    };
}

interface IPublishingSchedule {
    enabled: boolean;
    publishDate?: Date;
    timezone: string;
    recurring?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        daysOfWeek?: number[];
    };
}

interface ICrossPosting {
    enabled: boolean;
    platforms: SYSTEM_PLATFORM[];
    syncStatus: boolean;
    adaptContent: boolean;
}
```

### Web Integration
```typescript
interface IWebSettings {
    access: {
        enabled: boolean;
        level: 'basic' | 'deep' | 'comprehensive';
        authentication: {
            method: 'none' | 'apiKey' | 'oauth';
            credentials: Record<string, string>;
        };
    };
    search: {
        depth: number;
        timeout: number;
        maxResults: number;
    };
    quality: {
        hallucination: {
            reduction: boolean;
            confidence: number;
            factChecking: boolean;
        };
        sources: {
            authorityThreshold: number;
            maxAge: number;
            preferredDomains: string[];
        };
    };
    caching: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
    };
}
```

## Integration Requirements

### API Integration
1. Authentication
   - OAuth2 flow
   - API key management
   - Token refresh

2. Rate Limiting
   - Per-endpoint limits
   - Subscription-based quotas
   - Recovery strategies

3. Error Handling
   - Standardized errors
   - Recovery procedures
   - Logging and monitoring

### Platform Integration
1. Content Adaptation
   - Format conversion
   - Media optimization
   - SEO preservation

2. Synchronization
   - Status tracking
   - Conflict resolution
   - Version control

3. Analytics
   - Performance tracking
   - Engagement metrics
   - ROI calculation

## Development Guidelines

### Code Organization
- Settings modules by feature
- Clear interfaces
- Strict typing
- Documentation

### Testing Requirements
- Unit tests for validation
- Integration tests
- Performance testing
- Security testing

### Security Considerations
- API key encryption
- Access control
- Data validation
- Audit logging

For implementation details, refer to `blog.md`.

