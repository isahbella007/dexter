
import {OpenAI} from "openai"
import {config} from "./index"

export const openai = new OpenAI({apiKey: config.apikeys.openAI})