export type AiTask='seo_title'|'seo_description'|'seo_keywords'|'seo_outline'|'seo_rewrite'|'seo_audit'|'content_summary'|'content_rewrite'|'content_translate'|'custom'
export type AiRole='system'|'user'|'assistant'
export type AiMessage={role:AiRole;content:string}
export type AiRequest={task:AiTask;messages:AiMessage[];model?:string;temperature?:number;maxOutputTokens?:number;responseFormat?:'text'|'json';metadata?:Record<string,string|number|boolean|null>}
export type AiResult={text:string;provider:string;model:string;usage?:{inputTokens?:number;outputTokens?:number;totalTokens?:number};requestId?:string}
export interface AiProvider{name:string;generate(request:AiRequest):Promise<AiResult>}
