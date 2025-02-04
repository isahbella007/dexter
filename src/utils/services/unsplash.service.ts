import axios from 'axios';
import { config } from '../../config';

export async function getBlogImage(query: string): Promise<string> {
    const { accessKey } = config.unsplash;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${accessKey}`;

    try {
        const response = await axios.get(url);
        if (response.data.results.length > 0) {
            console.log('image url found =>', response.data.results)
            return response.data.results[0].urls.small; // Use the first result
        }
    } catch (error) {
        console.error('Error fetching image:', error);
    }
    return ''; // Return empty string if no image is found
}

export async function replaceImagePlaceholders(content: string): Promise<string> {
    const imagePlaceholderRegex = /\[IMAGE: (.*?)\]/g;
    let match;
    let updatedContent = content;

    while ((match = imagePlaceholderRegex.exec(content)) !== null) {
        const placeholder = match[0];
        const query = match[1];
        const imageUrl = await getBlogImage(query);

        if (imageUrl) {
            updatedContent = updatedContent.replace(placeholder, `![${query}](${imageUrl})`);
        } else {
            updatedContent = updatedContent.replace(placeholder, ''); // Remove placeholder if no image is found
        }
    }

    return updatedContent;
}