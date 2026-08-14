import type{AiProvider,AiRequest,AiResult}from'./types'
const providers=new Map<string,AiProvider>()
export function registerAiProvider(provider:AiProvider){providers.set(provider.name,provider)}
export function listAiProviders(){return[...providers.keys()]}
export function hasAiProvider(name:string){return providers.has(name)}
export async function runAi(providerName:string,request:AiRequest):Promise<AiResult>{const provider=providers.get(providerName);if(!provider)throw new Error(`ai_provider_not_registered:${providerName}`);return provider.generate(request)}
