import axios from 'axios';
import { config } from '../../config';
// Helper function for delaying execution
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateBlogImage(prompt: string): Promise<{imageUrl: string, imageUrlId: string}> {
    // Replace with your actual Leonardo AI API call
    const apiKey = config.imageGeneration.leonardoAI 
    const apiUrl = 'https://cloud.leonardo.ai/api/rest/v1/generations'
    const defaultModelId = "b2614463-296c-462a-9586-aafdb8f00e36" //flux dev model  

    try {
        const response = await axios.post(apiUrl, {
            prompt: prompt,
            modelId: defaultModelId, 
            width: 512, 
            height: 512, 
            num_images: 1, 
            styleUUID: "111dc692-d470-4eec-b791-3475abac4c46" //dynamic
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('API Cost', response.data.sdGenerationJob)
        // Extract the generationId
        const generationId = response.data.sdGenerationJob?.generationId
        if(!generationId){ 
            console.error("Leonardo AI did not return a generation Id")
            return  {imageUrl: '', imageUrlId: ''}
        }

        // Reterive the Image 
        const getImageUrl = `${apiUrl}/${generationId}`
        let retries = 3
        let imageUrl = ''
        let imageUrlId = ''

        while (retries > 0 && !imageUrl){ 
            await delay(5000)
            try{ 
                const getResponse = await axios.get(getImageUrl, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });
                // console.log("Get response from Leonardo AI", getResponse)

                // Check if the generation is complete and get the URL
                if (getResponse.data?.generations_by_pk?.status == 'COMPLETE' ) {
                    console.log('generated image =>', JSON.stringify(getResponse.data.generations_by_pk.generated_images, null, 2) )
                    imageUrl = getResponse.data.generations_by_pk.generated_images[0].url;
                    imageUrlId = getResponse.data.generations_by_pk.generated_images[0].id;
                } else {
                    console.log('Image not ready yet, retrying...');
                    retries--;
                }
            }catch (getError) {
                console.error('Error retrieving image from Leonardo AI:', getError);
                retries--;
                await delay(2000); // Wait a bit longer after an error
            }
        }

        if (!imageUrl || !imageUrlId) {
            console.error(`Failed to retrieve image after multiple retries for generationId: ${generationId}`);
            return  {imageUrl: '', imageUrlId: ''}
        }

        return {imageUrl, imageUrlId};
    
    } catch (error) {
        console.error('Error fetching image from Leonardo AI:', error);
        return  {imageUrl: '', imageUrlId: ''} // Return empty string on error
    }
}

export async function regenerateBlogImage(prompt: string): Promise<string> {
    const apiKey = config.imageGeneration.leonardoAI;
    const apiUrl = 'https://cloud.leonardo.ai/api/rest/v1/generations';
    const defaultModelId = "b2614463-296c-462a-9586-aafdb8f00e36"; //flux dev model

    try {
        const response = await axios.post(apiUrl, {
            prompt: prompt,
            modelId: defaultModelId,
            width: 512,
            height: 512,
            num_images: 1,
            styleUUID: "111dc692-d470-4eec-b791-3475abac4c46"
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        // Extract the generationId
        const generationId = response.data.sdGenerationJob?.generationId;
        if (!generationId) {
            console.error("Leonardo AI did not return a generation Id");
            return '';
        }

        // Retrieve the Image
        const getImageUrl = `${apiUrl}/${generationId}`;
        let retries = 5; // Increased retries
        let imageUrl = '';

        while (retries > 0 && !imageUrl) {
            await delay(5000); // Increased initial delay to 10 seconds
            try {
                const getResponse = await axios.get(getImageUrl, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                });
                // console.log("Get response from Leonardo AI", getResponse)

                // Check if the generation is complete and get the URL
                if (getResponse.data?.generations_by_pk?.status === 'COMPLETE') {
                    // console.log('generated image =>', getResponse.data.generations_by_pk.generated_images);
                    imageUrl = getResponse.data.generations_by_pk.generated_images[0].url;
                } else {
                    console.log('Image not ready yet, retrying...');
                    retries--;
                }
            } catch (getError) {
                console.error('Error retrieving image from Leonardo AI:', getError);
                retries--;
                await delay(5000); // Wait a bit longer after an error.  Increased to 5 seconds
            }
        }

        if (!imageUrl) {
            console.error(`Failed to retrieve image after multiple retries for generationId: ${generationId}`);
            return '';
        }
      return imageUrl
    } catch (error) {
        console.error('Error fetching image from Leonardo AI:', error);
        return ''; // Return empty string on error
    }
}

export function updateImagePlaceholder(
    originalContent: string,
    identifier: string,
    newImageUrl: string
): string {
    const regex = new RegExp(`!\\[(${identifier}): (.*?)\\]\\((.*?)\\)`);
    const match = originalContent.match(regex);

    if (!match) {
        console.warn(`Image placeholder with identifier "${identifier}" not found.`);
        return originalContent; // Return original content if not found
    }

    const [, , originalAltText] = match; // Extract the original alt text
    const newPlaceholder = `![${identifier}: ${originalAltText}](${newImageUrl})`;

    return originalContent.replace(regex, newPlaceholder);
}

export async function replaceImagePlaceholders(content: string): Promise<string> {
    const imagePlaceholderRegex = /\[IMAGE: (.*?)\]/g;
    const matches = [...content.matchAll(imagePlaceholderRegex)];

    // Limit to first two image placeholders
    const limitedMatches = matches.slice(0, 2);

    // console.log('The limited matches are', limitedMatches)

    const promises = limitedMatches.map(match => generateBlogImage(match[1]));

    // Fetch all images concurrently
    const imageUrls = await Promise.all(promises);

    // Replace placeholders with image URLs
    let updatedContent = content;
    for (let i = 0; i < limitedMatches.length; i++) {
        const placeholder = limitedMatches[i][0];
        const imageUrl = imageUrls[i];
        const imageDescription = limitedMatches[i][1];

        if (imageUrl) {
            updatedContent = updatedContent.replace(placeholder, `[${imageUrl.imageUrlId}: ${imageDescription}](${imageUrl.imageUrl})`);
        } else {
            updatedContent = updatedContent.replace(placeholder, ''); // Remove placeholder if no image
        }
    }

    return updatedContent;
}