**Project Overview: Dexter**
A full-stack TypeScript/Node.js blog platform with AI integration, subscription management, and multi-platform publishing capabilities.

**Technical Stack & Core Dependencies**
1. Backend: Express.js with TypeScript
2. Database: MongoDB with Mongoose
3. Authentication: Passport.js with JWT
4. Payment: Stripe Integration
5. AI Services: OpenAI & Anthropic
6. Email: Nodemailer
7. Security: Helmet, CORS, Rate Limiting
8. Testing: Jest

**Core System Components**

1. **Authentication System** (`/api/auth`)
   - JWT-based session management
   - 2FA support (speakeasy/otplib)
   - Role-based access control
   - API key management (see `blog-settings.md`)
   - Platform OAuth integrations

2. **Blog System** (`/api/blog`)
   - Content generation & management
   - Multi-platform publishing
   - SEO optimization
   - Bulk generation support
   - Version history tracking
   - See `blog.md` for implementation details

3. **AI Integration** (`/utils/services`)
   ```typescript
   interface IAIService {
       generateContent(prompt: string, settings: IPostSettings): Promise<string>;
       trackUsage(settings: IPostSettings, tokens: number): Promise<void>;
       validateAPIKey(apiKey: string): Promise<boolean>;
       estimateTokens(content: string): number;
       getModelContext(model: string): number;
   }
   ```
   - Multi-provider support (OpenAI, Anthropic)
   - Usage tracking & rate limiting
   - Custom API key management
   - Token estimation & optimization
   - See `blog-settings.md` for configuration

4. **Subscription System** (`/api/subscription`)
   ```typescript
   interface ISubscriptionPlan {
       type: 'FREE' | 'PRO' | 'ENTERPRISE';
       limits: {
           postsPerMonth: number;
           maxArticleSize: ArticleType;
           availableModels: AiModel[];
           customApiKey: boolean;
           platforms: SYSTEM_PLATFORM[];
       };
       features: {
           bulkGeneration: boolean;
           advancedSEO: boolean;
           prioritySupport: boolean;
       };
   }
   ```
   - Stripe integration
   - Plan management
   - Usage tracking
   - Billing portal integration

**System Architecture**

1. **API Layer**
   ```
   src/
   ├── api/           # Route handlers
   ├── controllers/   # Business logic
   ├── services/      # Core services
   │   ├── ai/        # AI provider services
   │   ├── blog/      # Blog services
   │   ├── platform/  # Publishing services
   │   └── analytics/ # Analytics services
   ├── models/        # Data models
   ├── middleware/    # Request processing
   └── utils/         # Shared utilities
   ```

2. **Service Layer**
   - Modular service architecture
   - Provider-agnostic interfaces
   - Event-driven communication
   - Pipeline pattern for content generation
   - Adapter pattern for platform integration
   - See `blog.md` for service implementations

3. **Security Architecture**
   - Request validation
   - Rate limiting per endpoint
   - API key encryption
   - CORS & Helmet configuration
   - OAuth2 for platform integrations

4. **Data Flow**
   ```mermaid
   graph TD
       A[Client Request] --> B[API Gateway]
       B --> C[Authentication]
       C --> D[Rate Limiting]
       D --> E[Controller]
       E --> F[Service Layer]
       F --> G1[Internal Services]
       F --> G2[External APIs]
       G1 --> H[Database]
       G2 --> I[Third-party Services]
   ```

**Integration Points**

1. **External Services**
   - AI Providers
     - OpenAI (GPT-3.5, GPT-4)
     - Anthropic (Claude 3 Haiku)
   - Publishing Platforms
     - WordPress REST API
     - Wix Content API
     - Shopify Blog API
   - Payment Processing
     - Stripe Subscription API
     - Stripe Billing Portal
   - Email Delivery
     - Nodemailer with SMTP

2. **Internal Systems**
   - Content Generation Pipeline
     - Keyword Analysis
     - Content Structure
     - SEO Optimization
   - Publishing Workflow
     - Platform-specific Formatting
     - Media Processing
     - Status Tracking
   - Subscription Management
     - Plan Enforcement
     - Usage Tracking
     - Billing Management

**Development Guidelines**

1. **Code Organization**
   - Feature-based directory structure
   - Clear separation of concerns
   - Interface-driven development
   - Comprehensive type definitions
   - Shared utilities and constants

2. **Testing Strategy**
   - Unit tests with Jest
   - Integration testing
   - E2E testing for critical paths
   - Mock external services
   - CI/CD pipeline integration

3. **Security Practices**
   - Secure credential management
   - API key rotation
   - Rate limiting implementation
   - Input validation
   - OAuth2 security best practices

4. **Performance Optimization**
   - Caching strategies
   - Database indexing
   - Request batching
   - Resource pooling
   - Token optimization for AI services

For detailed feature implementations, refer to:
- Blog System: `blog.md`
- Settings & Configuration: `blog-settings.md`
