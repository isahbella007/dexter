// import request from 'supertest';
// import { app } from '../../app';
// import { Chat } from '../../models/Chat';
// import { UsageTracking } from '../../models/UsageTracking';
// import { generateTestToken } from '../helpers/auth';

// describe('Chat API', () => {
//     let token: string;
//     let userId: string;

//     beforeAll(async () => {
//         // Setup test user and token
//         const user = await createTestUser(); // Helper function to create test user
//         userId = user._id;
//         token = generateTestToken(user);
//     });

//     beforeEach(async () => {
//         // Clear chat and usage data before each test
//         await Chat.deleteMany({});
//         await UsageTracking.deleteMany({});
//     });

//     describe('POST /api/chat/message', () => {
//         it('should generate a response for a new chat', async () => {
//             const response = await request(app)
//                 .post('/api/chat/message')
//                 .set('Authorization', `Bearer ${token}`)
//                 .send({
//                     message: 'What are the best SEO practices for 2024?'
//                 });

//             expect(response.status).toBe(200);
//             expect(response.body.data).toHaveProperty('chatId');
//             expect(response.body.data).toHaveProperty('latestMessage');
//         });

//         it('should respect daily usage limits', async () => {
//             // Simulate reaching usage limit
//             await UsageTracking.create({
//                 userId,
//                 usages: [{
//                     date: new Date(),
//                     count: 10 // Free tier limit
//                 }]
//             });

//             const response = await request(app)
//                 .post('/api/chat/message')
//                 .set('Authorization', `Bearer ${token}`)
//                 .send({
//                     message: 'This should fail due to usage limit'
//                 });

//             expect(response.status).toBe(403);
//             expect(response.body).toHaveProperty('message', 'You have exceeded your limit for today');
//         });
//     });

//     describe('GET /api/chat/history', () => {
//         it('should return paginated chat history', async () => {
//             // Create some test chats
//             await Chat.create([
//                 { userId, title: 'Chat 1', messages: [] },
//                 { userId, title: 'Chat 2', messages: [] }
//             ]);

//             const response = await request(app)
//                 .get('/api/chat/history')
//                 .set('Authorization', `Bearer ${token}`);

//             expect(response.status).toBe(200);
//             expect(response.body.data).toHaveLength(2);
//         });
//     });
// }); 