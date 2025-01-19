import axios from "axios"
import { config } from "../../config"
import { User } from "../../models/User"
import { ErrorBuilder } from "../errors/ErrorBuilder"

export class ShopifyService { 
    private clientId: string
    private clientSecret: string
    private redirectUri: string
    private scopes: string

    constructor() { 
        this.clientId = config.shopify.clientId
        this.clientSecret = config.shopify.clientSecret
        this.redirectUri = config.shopify.developmentRedirectUri
        this.scopes = 'write_content,read_content'
    }

    async getAuthorizationUrl(state: string, shop: string): Promise<string>{ 
        const authUrl = `https://${shop}/admin/oauth/authorize` +
        `?client_id=${this.clientId}` +
        `&scope=${encodeURIComponent(this.scopes)}` +
        `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
        `&state=${state}`;

        return authUrl
    }

    async handleCallback(code: string, userId: string, shop: string): Promise<void>{ 
        try{ 
            const tokenResponse = await axios.post(
                `https://${shop}/admin/oauth/access_token`,
                {
                    client_id: this.clientId,
                    client_secret: this.clientSecret,
                    code,
                }
            );

            console.log(tokenResponse.data)

            // ** save token in oauth for wordpress
            this.saveToken(userId, tokenResponse.data.access_token, shop)  
        }catch(error){ 
            console.log(error)
        }
    }

    
    async  postBlogToShopify(storeDomain: string, accessToken: string, blogContent: any) {
        const url = `https://${storeDomain}/admin/api/2025-01/blogs.json`;
        console.log('request url ->', url)
        console.log('blog content ->', blogContent)

        // Wrap the content in a blog object
        const payload = {
            blog: {
                title: blogContent.title,
                body_html: blogContent.body_html,
                author: blogContent.author
            }
        };

        try {
            const response = await axios.post(url, payload, {       
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            });
    
            console.log('Blog posted successfully:', response.data);
            // return response.data;
        } catch (error:any) {
            console.log(JSON.stringify(error))
            // console.error('Error posting blog:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    async getShopifyBlogs(accessToken:string, storeName: string){ 
        const url = `https://${storeName}/admin/api/2025-01/blogs.json`
        try{ 
            const response = await axios.get(url, { 
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
            })

            console.log('Blogs ->', response.data)
            return response.data
        }catch(error: any){ 
            console.log('There is an error that occured while getting the blogs', error)
        }
    }

    private async saveToken(userId: string, token: string, shop: string): Promise<void>{ 
        const user = await User.findById(userId)
        if(!user) throw ErrorBuilder.notFound('User not found')
        user?.oauth?.shopify.push({accessToken: token, storeName: shop})
        await user.save()
    }

    

}

export const shopifyService = new ShopifyService()