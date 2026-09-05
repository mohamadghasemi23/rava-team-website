import {readFile,stat} from 'node:fs/promises'
import {resolve} from 'node:path'

const root=process.cwd()
const config=JSON.parse(await readFile(resolve(root,'config/frontend-performance-budgets.json'),'utf8'))
const failures=[]

for(const group of config.assetGroups||[]){
  let total=0
  for(const asset of group.assets||[]){
    try{
      const size=(await stat(resolve(root,asset))).size
      total+=size
      if(size>group.maxAssetBytes)failures.push(`${group.key}: ${asset} is ${size} bytes; maximum is ${group.maxAssetBytes}`)
    }catch(error){
      failures.push(`${group.key}: missing asset ${asset} (${error.code||'read error'})`)
    }
  }
  if(total>group.maxTotalBytes)failures.push(`${group.key}: total is ${total} bytes; maximum is ${group.maxTotalBytes}`)
  else console.log(`PASS ${group.key}: ${total}/${group.maxTotalBytes} bytes`)
}

if(failures.length){
  console.error(failures.join('\n'))
  process.exitCode=1
}else console.log('Frontend performance budgets verified.')
