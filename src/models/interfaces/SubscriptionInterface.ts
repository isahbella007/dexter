import mongoose from "mongoose";
import { BillingCycle, SubscriptionStatus, SubscriptionType } from "../Subscription";

export interface ISubscription {
    type: SubscriptionType;
    billingCycle: BillingCycle;
    price: number;
    startDate: Date;
    endDate?: Date;
    status: SubscriptionStatus;
    autoRenew: boolean;
    lastBillingDate?: Date;
    nextBillingDate?: Date;
    stripePlanId?: string;
    paymentHistory: {
      paymentId: string;
      amount: number;
      status: string;
      date: Date;
    }[];
    statusHistory: {
      status: SubscriptionStatus;
      date: Date;
      reason?: string;
    }[];
}

export interface ISubscriptionPlan extends Document {
    name: string;
    description: string;
    type: SubscriptionType;
    price: number;
    currency: string;
    billingCycle: BillingCycle;
    stripePlanId?: string;
    stripePlanPriceId?: string;
    mercadoPagoId?: string;
    features: string[];
    isActive: boolean;
    deletedAt?: Date;
    deletedBy?: mongoose.Types.ObjectId;
    auditLog: {
        action: 'created' | 'updated' | 'deleted';
        userId?: mongoose.Types.ObjectId;
        timestamp: Date;
        changes?: Record<string, unknown>;
    }[];
}