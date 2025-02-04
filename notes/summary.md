Summary of Blog Settings Update Flow
1. Core Files Involved
    blogSettings.routes.ts: Handles the PATCH request for updating blog settings.
    blogSettings.controller.ts: Manages the request, extracts user and blog post details, and delegates to the service layer.
    blogSettings.service.ts: Contains the business logic for analyzing settings changes and regenerating content.
    settingsChange.service.ts: Detects and analyzes changes between old and new settings.
    settingsValidation.service.ts: Validates settings and ensures model compatibility.
    openAIService.ts: Handles the actual regeneration of blog content using AI.
    AIPromptBuilder.ts: Constructs system and user prompts for AI content generation.
---
2. Key Workflow
    1. Request Handling
        A PATCH request is made to /api/settings/blog/ with new settings.
        The controller extracts blogPostId and userId from the request.
    2. Settings Validation
        The new settings are validated using validateSettings:
        Ensures each field meets validation rules.
        Checks for model compatibility with validateModelCompatibility.
    3. Change Detection
        detectChanges compares old and new settings:
        Identifies specific fields that have changed.
        Determines the impact level (full, partial, style, none).
        Impact Analysis
        analyzeImpact calculates:
        Overall impact level (based on the highest impact change).
        Affected sections (for partial changes).
        Token and cost estimates.
    5. Content Regeneration (if needed)
        If the change type is full:
        Fetches the user's subscription plan.
        Validates token requirements based on article size and AI model.
        Constructs a RegenerationConfig object.
        Calls regenerateBlogContent to generate new content.
    6. Prompt Building
        AIPromptBuilder creates:
        System Prompt: Defines the AI's role, tone, and formatting instructions.
        User Prompt: Specifies the topic, keywords, and content requirements.
        AI Content Generation
        openAIService uses the prompts to generate new blog content.
        Returns the regenerated content to the client.
---
3. Key Interfaces and Types
    CompleteSettings: Combines settings, mediaSettings, and structure.
    SettingsChange: Represents a single change with field, from, to, and impact.
    ChangeAnalysis: Summarizes the overall impact of changes.
    RegenerationConfig: Contains all parameters needed for content regeneration.
---
4. Validation Rules
    Field Validation: Each setting field is validated against predefined rules.
    Model Compatibility: Ensures the selected AI model supports the requested article size.
---
5. Error Handling
    Validation Errors: Thrown if settings are invalid or incompatible.
    Content Generation Errors: Thrown if AI fails to regenerate content.
---
6. Key Functions
    analyzeSettingsChange: Validates and analyzes settings changes.
    detectChanges: Compares old and new settings to identify changes.
    analyzeImpact: Determines the overall impact of changes.
    regenerateBlogContent: Handles AI-based content regeneration.
    buildSystemPrompt / buildUserPrompt: Constructs prompts for AI content generation.
---
7. Example Flow
    User sends a PATCH request with new settings.
    System validates the settings and checks model compatibility.
    Changes are detected and analyzed.
    If a full regeneration is needed:
        Token requirements are calculated.
        Prompts are built.
        AI generates new content.

5. The regenerated content or change analysis is returned to the client.