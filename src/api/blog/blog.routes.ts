import { Router } from 'express';
import { blogPostController } from './blog.controller';
import { rateLimitBulk, rateLimitSingle } from '../../middleware/rateLimiter';
import { authenticate } from '../../middleware/auth.middleware';


const blogPostRoutes = Router();

// this is the for the single post generation 
// !!TODO:: consider determining the rate limit based on the user's subscription plan
blogPostRoutes.post('/generate-title',  rateLimitSingle, blogPostController.generateTitle)
blogPostRoutes.post('/keyword-traffic',  rateLimitBulk, blogPostController.generateMonthlyTraffic)
blogPostRoutes.post('/generate-single-article',  rateLimitSingle, blogPostController.generateSingleArticle)

// everything below this is for the bulk post generation 
blogPostRoutes.post('/generate-main-keywords', rateLimitBulk, blogPostController.generateMainKeywords)
blogPostRoutes.post('/generate-bulk-titles', rateLimitBulk, blogPostController.generateBulkTitles)
blogPostRoutes.post('/generate-bulk-keywords', rateLimitBulk, blogPostController.generateBulkKeywords)
blogPostRoutes.post('/bulk-generate', blogPostController.initiateBulkGeneration)

// Normal crud operation 
blogPostRoutes.get('/', blogPostController.getBlogPost)
blogPostRoutes.get('/single', blogPostController.getSingleBlogPost)
blogPostRoutes.patch('/update', blogPostController.updateBlogPost)
blogPostRoutes.patch('/update-section', blogPostController.updateBlogPostSection)
blogPostRoutes.delete('/delete-blog-post',  blogPostController.deleteBlogPost)

export default blogPostRoutes; 