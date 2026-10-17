import { sql } from "drizzle-orm";
import type { Db } from "./index";

export async function schemaViolations(db: Db): Promise<string[]> {
  const rows = await db.select({ violation: sql<string>`violation` }).from(sql`(
    select c.relname || ': RLS is disabled' as violation
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    union all
    select tablename || ': policies must be absent' from pg_policies where schemaname = 'public'
    union all
    select c.relname || '.' || a.attname || ': invalid column convention'
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type element_type on element_type.oid = t.typelem
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
    and (t.typname = 'timestamp' or element_type.typname = 'timestamp'
      or t.typtype = 'e' or element_type.typtype = 'e' or a.attidentity <> ''
      or pg_get_expr(d.adbin, d.adrelid) like 'nextval(%'
      or (exists (select 1 from pg_index i where i.indrelid = c.oid and i.indisprimary and a.attnum = any(i.indkey))
        and (t.typname <> 'uuid' or coalesce(pg_get_expr(d.adbin, d.adrelid), '') <> 'gen_random_uuid()')))
  ) violations`);
  return rows.map((row) => row.violation).sort();
}

export function hasPlatformSchemaReference(migration: string): boolean {
  return /\b(?:"?auth"?|"?storage"?)\s*\./i.test(migration);
}
