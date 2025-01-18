import mongoose, { model, Schema } from "mongoose";

export interface IKeywordTraffic {
    keyword: string;
    traffic: number;
    lastUpdated: Date;
}
  
const keywordTrafficSchema = new Schema<IKeywordTraffic>({
    keyword: { type: String, required: true, unique: true },
    traffic: { type: Number, required: true },
    lastUpdated: { type: Date, required: true }
});
  
export const KeyWordTrafficModel = model<IKeywordTraffic>('KeywordTraffic', keywordTrafficSchema);
