import { redirect } from 'next/navigation'

export default function ErrorsPage(){
  redirect('/admin/logs?view=errors')
}
