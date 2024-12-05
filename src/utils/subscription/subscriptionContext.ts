import { SubscriptionType } from "../../models/Subscription";
import { FreeStrategy } from "./strategies/freeUserStrategy";
import { ProStrategy } from "./strategies/proUserStrategy";
import { VisitorStrategy } from "./strategies/visitorStrategy";
import { ISubscriptionStrategy } from "./subscriptionStrategy.interface";

export class SubscriptionContext{ 
    private strategy: ISubscriptionStrategy = new ProStrategy(); 

    constructor(type: SubscriptionType) {
        this.setStrategy(type);
    }

    setStrategy(type: SubscriptionType) {
        switch(type) {
            case SubscriptionType.PRO: 
                this.strategy = new ProStrategy(); 
                break; 
            case SubscriptionType.FREE: 
                this.strategy = new FreeStrategy(); 
                break; 
            case SubscriptionType.VISITOR: 
                this.strategy = new VisitorStrategy(); 
                break; 
        }
    }

    getStrategy(): ISubscriptionStrategy {
        return this.strategy; 
    }
}