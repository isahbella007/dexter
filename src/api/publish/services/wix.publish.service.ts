// import { WixService } from '../../../utils/services/wix.service';
// import { BlogPost } from '../../../models/BlogPost';
// import { ErrorBuilder } from '../../../utils/errors/ErrorBuilder';
// import { marked } from 'marked';

// export class WixPublishService {
//   private wixService: WixService;

//   constructor() {
//     this.wixService = new WixService();
//   }

//   private convertMarkdownToHTML(markdown: string): string {
//     marked.setOptions({
//       breaks: true,
//       gfm: true,
//     });

//     return marked(markdown) as string;
//   }

//   async publishPost(userId: string, request: IPublishRequest) {
//     const blogPost = await BlogPost.findOne({ 
//       _id: request.blogPostId,
//       userId 
//     });

//     if (!blogPost) {
//       throw ErrorBuilder.notFound('Blog post not found');
//     }

//     try {
//       // Convert markdown content to HTML
//       const htmlContent = this.convertMarkdownToHTML(blogPost.content);

//       const publishedData = await this.wixService.createPost(
//         userId,
//         request.platformId,
//         {
//           title: blogPost.title,
//           content: htmlContent,
//           status: 'publish'
//         }
//       );

//       // Update blog post with publication status
//       await BlogPost.findByIdAndUpdate(request.blogPostId, {
//         $push: {
//           platformPublications: {
//             platform: 'wix',
//             status: 'published',
//             publishedUrl: publishedData.url,
//             publishedAt: new Date()
//           }
//         }
//       });

//       return { success: true, publishedUrl: publishedData.url };
//     } catch (error) {
//       // Update blog post with failed status
//       await BlogPost.findByIdAndUpdate(request.blogPostId, {
//         $push: {
//           platformPublications: {
//             platform: 'wix',
//             status: 'failed',
//             error: error.message
//           }
//         }
//       });

//       throw error;
//     }
//   }

//   async refreshSites(userId: string) {
//     const sites = await this.wixService.fetchAndStoreSites(userId);
//     return {
//       platform: 'wix',
//       sites,
//       lastRefreshed: new Date()
//     };
//   }
// } 