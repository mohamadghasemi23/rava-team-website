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
  'platform/billing/[id]/page.tsx',
  'system/access/page.tsx',
])

function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{const full=path.join(dir,entry.name);return entry.isDirectory()?walk(full):[full]})}
const errors=[]
for(const file of walk(adminRoot).filter(file=>file.endsWith('.tsx'))){
  const relative=path.relative(adminRoot,file).split(path.sep).join('/')
  if(allowedInfrastructure.has(relative)||legacyMigrationQueue.has(relative))continue
  const source=fs.readFileSync(file,'utf8')
  const localeAware=source.includes('getAdminLocale')||source.includes('useAdminLocale')
  if(!localeAware)errors.push(`${relative}: admin UI must use the centralized locale runtime`)
}
for(const legacy of legacyMigrationQueue){
  if(!fs.existsSync(path.join(adminRoot,legacy)))errors.push(`${legacy}: stale localization migration entry`)
}
if(errors.length){
  console.error('\nRAVA admin localization verification failed:\n')
  for(const error of errors)console.error(`- ${error}`)
  process.exit(1)
}
console.log(`RAVA admin localization verified; ${legacyMigrationQueue.size} legacy files remain in the explicit migration queue.`)
