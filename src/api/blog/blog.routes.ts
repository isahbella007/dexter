import { Router } from 'express';
import { blogPostController } from './blog.controller';


const blogPostRoutes = Router();

blogPostRoutes.post('/single/create', blogPostController.createTempSinglePost)
blogPostRoutes.post('/single/update-keywords', blogPostController.updateMainKeywords)
blogPostRoutes.post('/generate-title', blogPostController.generateTitle)
blogPostRoutes.post('/single/article', blogPostController.generateBlogPost)
blogPostRoutes.delete('/delete-blog-post', blogPostController.deleteBlogPost)

blogPostRoutes.post('/generate-main-keywords', blogPostController.generateMainKeywords)
blogPostRoutes.post('/generate-bulk-titles', blogPostController.generateBulkTitles)
blogPostRoutes.post('/generate-bulk-keywords', blogPostController.generateBulkKeywords)

blogPostRoutes.post('/bulk-generate', blogPostController.initiateBulkGeneration)

blogPostRoutes.get('/', blogPostController.getBlogPost)
export default blogPostRoutes; 