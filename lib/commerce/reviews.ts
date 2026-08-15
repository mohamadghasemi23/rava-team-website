export const REVIEW_STATUSES=['pending','published','hidden','rejected','deleted','spam'] as const
export function cleanText(value:unknown,max:number){return String(value??'').normalize('NFKC').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,max)}
export function validRating(v:unknown){const n=Number(v);return Number.isInteger(n)&&n>=1&&n<=5?n:null}
export function sanitizeDimensionScores(input:unknown,allowed:string[]){if(!input||typeof input!=='object'||Array.isArray(input))return{};const out:Record<string,number>={};for(const key of allowed){const n=Number((input as any)[key]);if(Number.isInteger(n)&&n>=1&&n<=5)out[key]=n}return out}
export function sanitizeReviewMedia(input:unknown){if(!Array.isArray(input))return[];return input.slice(0,8).map((x:any)=>({type:x?.type==='video'?'video':'image',url:cleanMediaUrl(x?.url),poster:cleanMediaUrl(x?.poster)})).filter(x=>x.url)}
function cleanMediaUrl(v:unknown){const s=String(v??'').trim();if(!s)return'';if(s.startsWith('/')||/^https:\/\//i.test(s))return s.slice(0,1000);return''}
export function ratingDistribution(rows:{rating:number}[]){const out:Record<string,number>={'1':0,'2':0,'3':0,'4':0,'5':0};for(const r of rows)if(out[String(r.rating)]!==undefined)out[String(r.rating)]++;return out}
