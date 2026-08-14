export type AccessLike={tenantRole?:string|null;platformRole?:string|null;isPlatform?:boolean;isPlatformAdmin?:boolean}
export function canEditContent(a:AccessLike){return ['super_admin','admin','content_manager'].includes(a.tenantRole||'')||['platform_owner','platform_admin','content_ops'].includes(a.platformRole||'')}
export function canManageTenantUsers(a:AccessLike){return a.tenantRole==='super_admin'||['platform_owner','platform_admin'].includes(a.platformRole||'')}
export function canViewAnalytics(a:AccessLike){return ['super_admin','admin'].includes(a.tenantRole||'')||['platform_owner','platform_admin','seo_manager','support_manager'].includes(a.platformRole||'')}
export function canRunManagedSeo(a:AccessLike){return ['platform_owner','platform_admin','seo_manager'].includes(a.platformRole||'')}
export function canViewContent(a:AccessLike){return Boolean(a.tenantRole)||['platform_owner','platform_admin','content_ops','seo_manager','support_manager','viewer'].includes(a.platformRole||'')}
