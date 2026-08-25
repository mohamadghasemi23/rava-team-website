-- Self-hosted Supabase may grant explicit function execution to API roles
-- through database default privileges. PUBLIC revocation alone is therefore
-- insufficient for this privileged provisioning RPC.
revoke all on function public.provision_organization_site(text,text,text,text,text,text,text)
  from public, anon;

grant execute on function public.provision_organization_site(text,text,text,text,text,text,text)
  to authenticated;
