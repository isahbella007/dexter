import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionType, BillingCycle } from './Subscription';
import { ISubscriptionPlan } from './interfaces/SubscriptionInterface';

const SubscriptionPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(SubscriptionType),
      required: true,
    },
    price: { type: Number, required: false },
    currency: {
      type: String,
      enum: ['ARS', 'BRL', 'CLP', 'MXN', 'COP', 'PEN', 'UYU', 'USD'],
      default: 'USD',
      required: false,
    },
    billingCycle: {
      type: String,
      enum: Object.values(BillingCycle),
      required: true,
    },
    stripePlanId: { type: String, required: false, unique: true },
    stripePlanPriceId: { type: String, required: false, unique: true },
    mercadoPagoId: { type: String, required: false, unique: false },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    auditLog: [
      {
        action: {
          type: String,
          enum: ['created', 'updated', 'deleted'],
          required: true,
        },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
        timestamp: { type: Date, default: Date.now },
        changes: { type: Schema.Types.Mixed },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
);
