import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const adminRoot=path.join(root,'app','admin')
const allowedInfrastructure=new Set([
  'components/AdminIcon.tsx','components/AdminLocale.tsx','components/AdminShell.tsx','layout.tsx','page.tsx','pages/layout.tsx',
])
// Existing pages are removed from this list only after both locales are verified.
// New files are never added: CI must reject new one-language admin UI.
const legacyMigrationQueue=new Set([
])

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
function readArgument(source,start){
  let index=start,depth=0,quote=null,text=''
  while(index<source.length&&/\s/.test(source[index]))index++
  for(;index<source.length;index++){
    const char=source[index],next=source[index+1]
    if(quote){
      if(char==='\\'){index++;continue}
      if(char===quote){quote=null;continue}
      if(quote==='`'&&char==='$'&&next==='{'){
        let braces=1;index+=2
        for(;index<source.length&&braces;index++){
          if(source[index]==='\\'){index++;continue}
          if(source[index]==='{')braces++
          else if(source[index]==='}')braces--
        }
        index--;continue
      }
      text+=char;continue
    }
    if(char==='\''||char==='"'||char==='`'){quote=char;continue}
    if(char==='('||char==='['||char==='{'){depth++;continue}
    if(char===')'||char===']'||char==='}'){if(depth===0)return{text,index};depth--;continue}
    if(char===','&&depth===0)return{text,index:index+1}
  }
  return{text,index}
}
function localizedCalls(source){
  const calls=[];const matcher=/\bl\s*\(/g;let match
  while((match=matcher.exec(source))){
    const fa=readArgument(source,matcher.lastIndex),en=readArgument(source,fa.index)
    calls.push({fa:fa.text,en:en.text,offset:match.index});matcher.lastIndex=Math.max(en.index,matcher.lastIndex)
  }
  return calls
}
function lineAt(source,offset){return source.slice(0,offset).split('\n').length}
const errors=[]
for(const file of walk(adminRoot).filter(file=>file.endsWith('.tsx'))){
  const relative=path.relative(adminRoot,file).split(path.sep).join('/')
  if(allowedInfrastructure.has(relative)||legacyMigrationQueue.has(relative))continue
  const source=fs.readFileSync(file,'utf8')
  const localeAware=source.includes('getAdminLocale')||source.includes('useAdminLocale')
  if(!localeAware)errors.push(`${relative}: admin UI must use the centralized locale runtime`)
  for(const call of localizedCalls(source)){
    if(/[A-Za-z]/.test(call.fa))errors.push(`${relative}:${lineAt(source,call.offset)}: Persian localized copy contains Latin text: ${call.fa.trim()}`)
    if(/[\u0600-\u06ff]/.test(call.en))errors.push(`${relative}:${lineAt(source,call.offset)}: English localized copy contains Persian text: ${call.en.trim()}`)
  }
}
for(const legacy of legacyMigrationQueue){
  if(!fs.existsSync(path.join(adminRoot,legacy)))errors.push(`${legacy}: stale localization migration entry`)
}
for(const file of walk(adminRoot).filter(file=>file.endsWith('actions.ts'))){
  const relative=path.relative(adminRoot,file).split(path.sep).join('/')
  const source=fs.readFileSync(file,'utf8')
  if(!source.includes('getAdminLocale'))errors.push(`${relative}: Server Action messages must use the centralized locale runtime`)
  for(const call of localizedCalls(source)){
    if(/[A-Za-z]/.test(call.fa))errors.push(`${relative}:${lineAt(source,call.offset)}: Persian action copy contains Latin text: ${call.fa.trim()}`)
    if(/[\u0600-\u06ff]/.test(call.en))errors.push(`${relative}:${lineAt(source,call.offset)}: English action copy contains Persian text: ${call.en.trim()}`)
  }
}
if(errors.length){
  console.error('\nRAVA admin localization verification failed:\n')
  for(const error of errors)console.error(`- ${error}`)
  process.exit(1)
}
console.log(`RAVA admin localization verified; ${legacyMigrationQueue.size} legacy files remain in the explicit migration queue.`)
