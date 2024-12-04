import mongoose, { Schema } from 'mongoose';
import { ISubscription } from './interfaces/SubscriptionInterface';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLING = 'cancelling',
  CANCELLED = 'cancelled',
}

export enum SubscriptionType {
  FREE = 'free',
  PRO = 'pro',
}

export enum BillingCycle {
  MONTHS = 'months',
  DAYS = 'days',
  NONE = 'none', // For free subscriptions
}



export const subscriptionSchema = new Schema<ISubscription>(
  {
    type: {
      type: String,
      enum: Object.values(SubscriptionType),
      default: SubscriptionType.FREE,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      default: BillingCycle.NONE,
    },
    price: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(SubscriptionStatus),
      default: SubscriptionStatus.ACTIVE,
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    lastBillingDate: {
      type: Date,
    },
    nextBillingDate: {
      type: Date,
    },
    stripePlanId: {type: String},
    paymentHistory: [
      {
        paymentId: { type: String, required: true },
        amount: { type: Number, required: true },
        status: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(SubscriptionStatus),
          required: true,
        },
        date: { type: Date, default: Date.now },
        reason: { type: String },
      },
    ],
  },
  {
    _id: false,
    timestamps: true,
  }
);

// Add index for querying active subscriptions
subscriptionSchema.index({ status: 1, nextBillingDate: 1 });

export const Subscription = mongoose.model<ISubscription>(
  'Subscription',
  subscriptionSchema
);
