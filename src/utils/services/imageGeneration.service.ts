import axios from 'axios';
import { config } from '../../config';

export async function generateBlogImage(prompt: string): Promise<string> {
    // Replace with your actual Leonardo AI API call
    const apiKey = config.imageGeneration.leonardoAI 
    const apiUrl = 'https://something.com'
    const defaultModelId = "6bef9f1b-29cb-40c7-b9df-32b51c1f67d3" //creative model  

    try {
        const response = await axios.post(apiUrl, {
            prompt: prompt,
            modelId: defaultModelId, 
            width: 512, 
            height: 512
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Adapt this based on Leonardo AI's response structure
        if (response.data && response.data.generations && response.data.generations.length > 0 && response.data.generations[0].url) {
            return response.data.generations[0].url; // Get the URL of the first generated image
        } else {
            console.error('Leonardo AI did not return an image URL:', response.data);
            return ''; // Return empty string on failure
        }
    } catch (error) {
        console.error('Error fetching image from Leonardo AI:', error);
        return ''; // Return empty string on error
    }
}

export async function replaceImagePlaceholders(content: string): Promise<string> { // No imagePrompts parameter
    const imagePlaceholderRegex = /\[IMAGE: (.*?)\]/g;
    let match;
    const promises = [];
    const placeholders = [];
    const imagePrompts: string[] = [];

    // Collect all placeholders and create promises
    while ((match = imagePlaceholderRegex.exec(content)) !== null) {
        placeholders.push(match[0]); // Store the original placeholder
        imagePrompts.push(match[1]); // Extract and store the prompt
    }

    // Create promises for each image generation
    for (const prompt of imagePrompts) {
        promises.push(generateBlogImage(prompt));
    }

    // Fetch all images concurrently
    const imageUrls = await Promise.all(promises);

    // Replace placeholders with image URLs
    let updatedContent = content;
    for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        const imageUrl = imageUrls[i];
        const imageDescription = imagePlaceholderRegex.exec(placeholder)![1]; //gets the image description for alt text

        if (imageUrl) {
            updatedContent = updatedContent.replace(placeholder, `![${imageDescription}](${imageUrl})`);
        } else {
            updatedContent = updatedContent.replace(placeholder, ''); // Remove placeholder if no image
        }
         imagePlaceholderRegex.lastIndex = 0;
    }

    return updatedContent;
}