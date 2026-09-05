export function GET(){
  return new Response(new Uint8Array(),{status:200,headers:{'Cache-Control':'public, max-age=86400','Content-Type':'image/x-icon'}})
}
