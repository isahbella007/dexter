import { WordPressService } from '../../../utils/services/wordpress.service';
import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from '../../../models/BlogPost';
import { ErrorBuilder } from '../../../utils/errors/ErrorBuilder';
import { marked } from 'marked';

export class WordPressPublishService {
  private wordpressService: WordPressService;

  constructor() {
    this.wordpressService = new WordPressService();
  }

  private convertMarkdownToHTML(markdown: string): string {
    // Configure marked options if needed
    marked.setOptions({
      breaks: true, // Adds <br> on single line breaks
      gfm: true,    // GitHub Flavored Markdown
    });

    return marked(markdown) as string;
  }

  async publishBlogPost(userId: string, siteId: string, blogPostId: string) {
    const blogPost = await BlogPost.findOne({ 
      _id: blogPostId,
      userId 
    });

    if (!blogPost) {
      throw ErrorBuilder.notFound('Blog post not found');
    }

    // console.log('blog post', blogPost)

    try {
        // covert the md content to html 
        const htmlContent = this.convertMarkdownToHTML(blogPost.content)
        console.log('html content', htmlContent)
      const publishedUrl = await this.wordpressService.createPost(
        userId,
        siteId,
        {
          title: blogPost.title,
          content: htmlContent,
          status: 'publish'
        }
      );

      console.log('published url is', JSON.stringify(publishedUrl, null, 2))

      // Update blog post with publication status
      await BlogPost.findByIdAndUpdate(blogPostId, {
        $push: {
          platformPublications: {
            platform: SYSTEM_PLATFORM.wordpress,
            status: PUBLISH_STATUS.published,
            publishedSiteId: siteId,
            publishedUrl: publishedUrl.short_URL,
            publishedSlug: publishedUrl.slug,
            publishedAt: new Date()
          }
        }
      });

      return { success: true, publishedUrl };
    } catch (error:any) {
        console.log('There is an error that occured while publishing the blog post', error)
      // Update blog post with failed status
      await BlogPost.findByIdAndUpdate(blogPostId, {
        $push: {
          platformPublications: {
            platform: SYSTEM_PLATFORM.wordpress,
            status: PUBLISH_STATUS.failed,
            error: error.message
          }
        }
      });

      throw error;
    }
  }

  
} 

export const wordpressPublishService = new WordPressPublishService()