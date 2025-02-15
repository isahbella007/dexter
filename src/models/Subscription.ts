import mongoose, { Schema } from 'mongoose';
import { ISubscription } from './interfaces/SubscriptionInterface';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TRIAL = 'trial',
  CANCELLING = 'cancelling',
  CANCELLED = 'cancelled',
}

export enum SubscriptionType {
  FREE = 'free',
  PRO = 'pro',
  VISITOR = 'visitor',
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
    stripeSubscriptionId: {type: String},
    stripePlanId: {type: String},
    statusHistory: [
      {
        status: {
          type: String,
          enum: Object.values(SubscriptionStatus),
          required: true,
        },
        price: {type: Number}, 
        paymentMethod: {type: String, default: "card"},
        invoiceId: {type: String},
        hostedInvoiceUrl: {type: String},
        invoiceUrl: {type: String},
        date: {type: Date, default: Date.now},
        startDate: { type: Date },
        endDate: { type: Date },
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
