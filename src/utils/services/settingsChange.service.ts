import { IPostSettings, IMediaSettings, IStructureSettings } from "../../models/interfaces/BlogPostInterfaces";
import { settingsValidationService } from "./settingsValidation.service";

export type ChangeType = 'full' | 'partial' | 'style' | 'none';

export interface SettingsChange {
    field: string;
    from: any;
    to: any;
    impact: ChangeType;
}

export interface ChangeAnalysis {
    changeType: ChangeType;
    changes: SettingsChange[];
    affectedSections?: string[];
    estimatedTokens?: number;
    estimatedCost?: number;
    requiresRegeneration: boolean;
}

export interface CompleteSettings {
    settings?: IPostSettings;
    mediaSettings?: IMediaSettings;
    structure?: IStructureSettings;
    detailsToInclude?: string;
    extraKeywords?: string[]
    internalLinks?: { title: string, url: string }[],
    connectToWeb?: {
        enhanceWithWebData?: boolean,
        scrappedInsights?: string[]
    }

}



export class SettingsChangeService {
    private readonly fullRegenerationFields = [
        'settings.language',
        'settings.articleSize',
        'settings.toneOfVoice',
        'settings.pointOfView',
        'settings.aiModel'
    ];

    private readonly partialRegenerationFields = [
        'settings.targetCountry',
        'structure.includeHook',
        'structure.includeConclusion'
    ];

    private readonly styleOnlyFields = [
        'settings.humanizeText',
        'structure.formatting',
        'structure.includeBold',
        'structure.includeItalics'
    ];

    detectChanges(oldSettings: CompleteSettings, newSettings: Partial<CompleteSettings>): SettingsChange[] {
        const changes: SettingsChange[] = [];


        // console.log('settingsChangeService -> oldSettings', oldSettings)
        // console.log('settingsChangeService -> newSettings', newSettings)
        // Validate core settings if provided
        if (newSettings.settings) {
            settingsValidationService.validateSettings(newSettings.settings);
        }


        // Helper function to detect changes in nested objects
        const detectNestedChanges = (
            oldObj: any,
            newObj: any,
            prefix: string
        ) => {
            if (!newObj) return;

            Object.entries(newObj).forEach(([key, newValue]) => {
                const fullPath = `${prefix}.${key}`;
                const oldValue = oldObj?.[key];

                if (newValue !== undefined && newValue !== oldValue) {
                    changes.push({
                        field: fullPath,
                        from: oldValue,
                        to: newValue,
                        impact: this.determineChangeImpact(fullPath)
                    });
                }
            });
        };

        // Detect changes in each settings category
        detectNestedChanges(oldSettings.settings, newSettings.settings, 'settings');
        detectNestedChanges(oldSettings.mediaSettings, newSettings.mediaSettings, 'mediaSettings');
        detectNestedChanges(oldSettings.structure, newSettings.structure, 'structure');
       
        // detect changes in the details to Include
        if(newSettings.detailsToInclude !== undefined && newSettings.detailsToInclude !== oldSettings.detailsToInclude){
            // console.log('new settings details to include', newSettings.detailsToInclude)
            // console.log('old settings details to include', oldSettings.detailsToInclude)
            changes.push({ 
                field: 'detailsToInclude',
                from: oldSettings.detailsToInclude,
                to: newSettings.detailsToInclude,
                impact: 'partial'
            })
        }  
   
        // detect changes in the extra keywords
        if(newSettings.extraKeywords !== undefined && newSettings.extraKeywords !== oldSettings.extraKeywords){
            // console.log('new settings extra keywords', newSettings.extraKeywords)
            // console.log('old settings extra keywords', oldSettings.extraKeywords)
            changes.push({ 
                field: 'extraKeywords',
                from: oldSettings.extraKeywords,
                to: newSettings.extraKeywords,
                impact: 'partial'
            })
            

        }

        // detect changes in the internal links
        if(newSettings.internalLinks !== undefined && newSettings.internalLinks !== oldSettings.internalLinks){
            // console.log('new settings internal links', newSettings.internalLinks)
            // console.log('old settings internal links', oldSettings.internalLinks)
            changes.push({
                field: 'internalLinks',
                from: oldSettings.internalLinks,
                to: newSettings.internalLinks,
                impact: 'partial'
            })
        }

        // detect changes in the connect to web
        if(newSettings.connectToWeb !== undefined && newSettings.connectToWeb !== oldSettings.connectToWeb){
            // console.log('new settings connect to web', newSettings.connectToWeb)
            // console.log('old settings connect to web', oldSettings.connectToWeb)
            changes.push({
                field: 'connectToWeb',  

                from: oldSettings.connectToWeb,
                to: newSettings.connectToWeb,
                impact: 'partial'
            })
        }
        



        return changes;
    }

    private determineChangeImpact(field: string): ChangeType {
        if (this.fullRegenerationFields.includes(field)) return 'full';
        if (this.partialRegenerationFields.includes(field)) return 'partial';
        if (this.styleOnlyFields.includes(field)) return 'style';
        return 'none';
    }

    analyzeImpact(changes: SettingsChange[], settings: CompleteSettings): ChangeAnalysis {
        // Determine the highest impact change
        const highestImpact = changes.reduce((highest, change) => {
            const impactOrder = { full: 3, partial: 2, style: 1, none: 0 };
            return impactOrder[change.impact] > impactOrder[highest as ChangeType] ? change.impact : highest;
        }, 'none' as ChangeType);

        // Calculate affected sections for partial changes
        const affectedSections = changes
            .filter(change => change.impact === 'partial')
            .map(change => {
                if (change.field === 'connectToWeb') return 'all sections'; // Mark as affecting all sections
                if (change.field === 'internalLinks') return 'all sections'; // Mark as affecting all sections
                if (change.field === 'extraKeywords') return 'all sections'; // Mark as affecting all sections
                if (change.field === 'detailsToInclude') return 'all sections'; // Mark as affecting all sections
                if (change.field.includes('hook')) return 'introduction';
                if (change.field.includes('conclusion')) return 'conclusion';
                return change.field.split('.').pop() || '';
            });

        // Calculate token and cost estimates if needed
        const { tokens, cost } = highestImpact !== 'none' && settings.settings
            ? settingsValidationService.calculateTokensAndCost(settings.settings)
            : { tokens: 0, cost: 0 };

        return {
            changeType: highestImpact,
            changes,
            affectedSections: affectedSections.length > 0 ? affectedSections : undefined,
            estimatedTokens: tokens,
            estimatedCost: cost,
            requiresRegeneration: highestImpact === 'full' || highestImpact === 'partial'
        };
    }
}

export const settingsChangeService = new SettingsChangeService(); 