import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'

const root=process.cwd()
const intelligence=JSON.parse(fs.readFileSync(path.join(root,'config/project-intelligence.json'),'utf8'))
const standards=JSON.parse(fs.readFileSync(path.join(root,'config/feature-standards.json'),'utf8'))

function patternRegex(pattern){
  const escaped=pattern.replace(/[.+^${}()|[\]\\]/g,'\\$&').replaceAll('**','::ALL::').replaceAll('*','[^/]*').replaceAll('::ALL::','.*')
  return new RegExp(`^${escaped}$`)
}
function walk(directory){
  if(!fs.existsSync(directory))return[]
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const full=path.join(directory,entry.name);return entry.isDirectory()?walk(full):[path.relative(root,full).replaceAll(path.sep,'/')]})
}
const repositoryFiles=walk(root).filter(file=>!file.startsWith('.git/')&&!file.startsWith('node_modules/')&&!file.startsWith('.next/'))
const matches=(feature,file)=>feature.paths.some(pattern=>patternRegex(pattern).test(file))

function verify(){
  const errors=[]
  if(intelligence.schemaVersion!==1||!Array.isArray(intelligence.features))errors.push('Invalid RPIM schema')
  const standardKeys=new Set(standards.features.map(feature=>feature.key)),rpimKeys=new Set()
  for(const feature of intelligence.features){
    if(!standardKeys.has(feature.key))errors.push(`${feature.key}: missing from feature standards`)
    if(rpimKeys.has(feature.key))errors.push(`${feature.key}: duplicate RPIM key`)
    rpimKeys.add(feature.key)
    if(!feature.area||!feature.summary)errors.push(`${feature.key}: area and summary are required`)
    if(!Array.isArray(feature.paths)||!feature.paths.length)errors.push(`${feature.key}: paths are required`)
    for(const pattern of feature.paths??[]){if(!repositoryFiles.some(file=>patternRegex(pattern).test(file)))errors.push(`${feature.key}: path pattern matches no repository file: ${pattern}`)}
    if(!Array.isArray(feature.verification)||!feature.verification.length)errors.push(`${feature.key}: verification commands are required`)
    for(const dependency of feature.dependsOn??[]){if(!standardKeys.has(dependency))errors.push(`${feature.key}: unknown dependency ${dependency}`)}
  }
  for(const key of standardKeys){if(!rpimKeys.has(key))errors.push(`${key}: missing RPIM entry`)}
  if(errors.length){console.error('\nRAVA Project Intelligence Map verification failed:\n');errors.forEach(error=>console.error(`- ${error}`));process.exitCode=1;return false}
  console.log(`RPIM verified for ${intelligence.features.length} features and ${repositoryFiles.length} scoped repository files.`)
  return true
}
function printFeature(feature){
  console.log(`\n${feature.key}  [${feature.area}]\n${feature.summary}`)
  console.log(`\nRead/change scope:\n${feature.paths.map(value=>`  - ${value}`).join('\n')}`)
  console.log(`\nDependencies:\n${feature.dependsOn.length?feature.dependsOn.map(value=>`  - ${value}`).join('\n'):'  - none'}`)
  console.log(`\nScoped verification:\n${feature.verification.map(value=>`  - ${value}`).join('\n')}`)
}
function featureLookup(query){
  const needle=query.toLowerCase(),found=intelligence.features.filter(feature=>`${feature.key} ${feature.area} ${feature.summary}`.toLowerCase().includes(needle))
  if(!found.length){console.error(`No RPIM feature matched: ${query}`);process.exitCode=1;return}
  found.forEach(printFeature)
}
function impact(files){
  const normalized=[...new Set(files.map(file=>file.trim().replace(/^\.\//,'')).filter(Boolean))]
  const affected=intelligence.features.filter(feature=>normalized.some(file=>matches(feature,file)))
  console.log(`\nChanged files:\n${normalized.map(file=>`  - ${file}`).join('\n')||'  - none'}`)
  if(!affected.length){console.log('\nNo feature-specific RPIM match. Run the full release gates.');return}
  console.log('\nAffected features:')
  affected.forEach(feature=>console.log(`  - ${feature.key} [${feature.area}]`))
  const commands=[...new Set(affected.flatMap(feature=>feature.verification))]
  console.log(`\nSuggested scoped verification:\n${commands.map(command=>`  - ${command}`).join('\n')}`)
}

const [command,...args]=process.argv.slice(2)
if(command==='verify')verify()
else if(command==='feature'&&args.length)featureLookup(args.join(' '))
else if(command==='impact')impact(args.length?args:execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).split('\n'))
else{
  console.log('RAVA Project Intelligence Map\n\nUsage:\n  npm run rpim -- feature <key or phrase>\n  npm run rpim -- impact [changed files...]\n  npm run rpim -- verify')
  if(command)process.exitCode=1
}
