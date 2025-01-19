import { marked } from "marked";
import { BlogPost, PUBLISH_STATUS, SYSTEM_PLATFORM } from "../../../models/BlogPost";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";
import { User } from "../../../models/User";
import { ShopifyService } from "../../../utils/services/shopify.service";

export class ShopifyPublishService{
    private shopifyService: ShopifyService

    constructor(){
        this.shopifyService = new ShopifyService()
    }

    private convertMarkdownToHTML(markdown: string): string {
        // Configure marked options if needed
        marked.setOptions({
          breaks: true, // Adds <br> on single line breaks
          gfm: true,    // GitHub Flavored Markdown
        });
    
        return marked(markdown) as string;
    }

    // **shopify id in this case is the _id of the object in the array where th access token for the store saved
    async publishBlogPost(userId: string, shopifyId: string, blogPostId: string) {
        try{ 
            const user = await User.findById(userId)
            if(!user) throw ErrorBuilder.notFound('User not found')
    
            const blogPost = await BlogPost.findOne({ 
              _id: blogPostId,
              userId 
            });
    
            if(!blogPost) throw ErrorBuilder.notFound('Blog post not found')
    
            const htmlContent = this.convertMarkdownToHTML(blogPost.content)
    
            const blogContent = {title: blogPost.title, body_html: htmlContent, author: 'Admin'}
            
            const shopId = user.oauth?.shopify.find((shop: any) => shop._id.toString() == shopifyId)
            if(!shopId) throw ErrorBuilder.notFound('Shopify ID not found')
    
            const storeToken = shopId.accessToken
            const storeName = shopId.storeName
    
            const publishedUrl = await this.shopifyService.postBlogToShopify(storeName, storeToken, blogContent)

            console.log('Shopify published ->', publishedUrl)
            return {success: true, publishedUrl}
        }catch(error: any){ 
            // console.log('There is an error that occured while publishing the blog post', error)
            // Update blog post with failed status
            await BlogPost.findByIdAndUpdate(blogPostId, {
              $push: {
                platformPublications: {
                  platform: SYSTEM_PLATFORM.shopify,
                  status: PUBLISH_STATUS.failed,
                  error: error.message
                }
              }
            });
      
            throw error;
        }
        

    }
}

export const shopifyPublishService = new ShopifyPublishService()