import { BlogPost } from "../../../models/BlogPost";
import { IUserSettings } from "../../../models/interfaces/UserInterface";
import { User } from "../../../models/User";
import { ErrorBuilder } from "../../../utils/errors/ErrorBuilder";

export class UserSettingsService {

    async handleBusinessDetails(userId: string, data: Partial<IUserSettings>) {
        const user = await User.findById(userId);
        if (!user) {
            throw ErrorBuilder.notFound('User not found');
        }

        // Update only provided fields
        if (data.business) {
            user.settings.business = {
                ...user.settings.business,
                ...data.business
            };
        }

        await user.save();
        return user.settings.business;
    }

    async deleteAccount(userId: string) {
        const user = await User.findById(userId);
        if (!user) {
            throw ErrorBuilder.notFound('User not found');
        }

        // Delete user's blog posts
        await BlogPost.deleteMany({ userId });

        // Cancel stripe subscription if exists

        // Delete the user
        // await user.deleteOne();

        return { message: 'Actively working on this feature' };
    }
}   

export const userSettingsService = new UserSettingsService()