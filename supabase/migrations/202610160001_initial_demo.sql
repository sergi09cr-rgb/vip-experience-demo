-- VIP Experience Demo
-- Fresh, tenant-isolated schema. It contains no production data.

create extension if not exists pgcrypto;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','expired')),
  expires_at timestamptz not null default (now() + interval '48 hours'),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text,
  nom text,
  rol text not null default 'usuari' check (rol in ('superadmin','admin','usuari','lector')),
  actiu boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id,id)
);

create table public.pending_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  nom text,
  rol text not null default 'usuari' check (rol in ('superadmin','admin','usuari','lector')),
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (workspace_id,email)
);

create or replace function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path=''
as $$
  select p.workspace_id
  from public.profiles p
  join public.workspaces w on w.id=p.workspace_id
  where p.id=auth.uid()
    and p.actiu=true
    and w.status='active'
    and w.expires_at>now()
  limit 1;
$$;

create or replace function public.has_active_profile()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select public.current_workspace_id() is not null;
$$;

create table public.comercials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  nom text not null,
  dni text,
  telefon text,
  correu text,
  data_naixement date,
  talla text,
  nom_samarreta text,
  actiu boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id,id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  empresa text not null,
  nom_client text,
  comercial_id uuid,
  telefon text,
  correu text,
  dni text,
  nacionalitat text,
  data_naixement date,
  talla text,
  nom_samarreta text,
  notes text,
  actiu boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  foreign key (workspace_id,comercial_id) references public.comercials(workspace_id,id) on delete set null (comercial_id)
);

create table public.partits (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  rival text not null,
  competicio text,
  data date,
  hora time,
  estat_data text not null default 'Pendiente' check (estat_data in ('Pendiente','Provisional','Confirmada')),
  estat_partit text not null default 'Planificado' check (estat_partit in ('Planificado','Jugado','Cancelado')),
  notes text,
  created_at timestamptz not null default now(),
  unique (workspace_id,id)
);

create table public.invitacions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  partit_id uuid not null,
  numero smallint not null check (numero in (1,2)),
  comercial_id uuid,
  client_id uuid,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  unique (workspace_id,partit_id,numero),
  foreign key (workspace_id,partit_id) references public.partits(workspace_id,id) on delete cascade,
  foreign key (workspace_id,comercial_id) references public.comercials(workspace_id,id) on delete set null (comercial_id),
  foreign key (workspace_id,client_id) references public.clients(workspace_id,id) on delete set null (client_id)
);

create table public.task_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  nom text not null,
  grup text,
  dies_offset integer,
  estat_correcte text,
  tipus text not null default 'estat' check (tipus in ('estat','camp_client','camp_comercial','talla')),
  camp_client text,
  camp_comercial text,
  ordre integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  estats text[] not null default '{}',
  responsable text,
  unique (workspace_id,id)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  partit_id uuid not null,
  invitacio_id uuid,
  template_id uuid,
  nom text not null,
  grup text,
  data_limit date,
  estat_actual text,
  estat_correcte text,
  completada boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completada_manual boolean not null default false,
  unique (workspace_id,id),
  foreign key (workspace_id,partit_id) references public.partits(workspace_id,id) on delete cascade,
  foreign key (workspace_id,invitacio_id) references public.invitacions(workspace_id,id) on delete cascade,
  foreign key (workspace_id,template_id) references public.task_templates(workspace_id,id) on delete set null (template_id)
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  nom text not null,
  quantitat integer not null default 0,
  actiu boolean not null default true,
  created_at timestamptz not null default now(),
  unique (workspace_id,id),
  unique (workspace_id,nom)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  material_id uuid not null,
  tipus text not null check (tipus in ('Entrada','Salida')),
  unitats integer not null check (unitats>0),
  partit_id uuid,
  client_id uuid,
  comercial_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  nota text,
  unique (workspace_id,id),
  check (tipus='Salida' or nota is null),
  foreign key (workspace_id,material_id) references public.materials(workspace_id,id) on delete cascade,
  foreign key (workspace_id,partit_id) references public.partits(workspace_id,id) on delete set null (partit_id),
  foreign key (workspace_id,client_id) references public.clients(workspace_id,id) on delete set null (client_id),
  foreign key (workspace_id,comercial_id) references public.comercials(workspace_id,id) on delete set null (comercial_id)
);

create table public.role_permissions (
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  role text not null check (role in ('lector','usuari','admin','superadmin')),
  permission text not null,
  allowed boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (workspace_id,role,permission)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  taula text not null,
  registre_id text,
  accio text not null,
  detall jsonb,
  created_at timestamptz not null default now()
);

create table public.backup_downloads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null default public.current_workspace_id() references public.workspaces(id) on delete cascade,
  last_access_at timestamptz not null default now()
);

create index profiles_workspace_idx on public.profiles(workspace_id);
create index clients_workspace_idx on public.clients(workspace_id);
create index comercials_workspace_idx on public.comercials(workspace_id);
create index partits_workspace_data_idx on public.partits(workspace_id,data);
create index invitacions_workspace_idx on public.invitacions(workspace_id);
create index tasks_workspace_limit_idx on public.tasks(workspace_id,data_limit);
create index materials_workspace_idx on public.materials(workspace_id);
create index movements_workspace_created_idx on public.stock_movements(workspace_id,created_at desc);
create index audit_workspace_created_idx on public.audit_log(workspace_id,created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.workspace_id=public.current_workspace_id()
      and p.rol in ('admin','superadmin') and p.actiu=true
  );
$$;

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.workspace_id=public.current_workspace_id()
      and p.rol='superadmin' and p.actiu=true
  );
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select coalesce((
    select case when p.rol='superadmin' then true else rp.allowed end
    from public.profiles p
    left join public.role_permissions rp
      on rp.workspace_id=p.workspace_id
     and rp.role=p.rol
     and rp.permission=p_permission
    where p.id=auth.uid() and p.actiu=true
  ),false);
$$;

create or replace function public.seed_demo_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  commercial_one uuid:=gen_random_uuid();
  commercial_two uuid:=gen_random_uuid();
  commercial_three uuid:=gen_random_uuid();
  commercial_four uuid:=gen_random_uuid();
  commercial_five uuid:=gen_random_uuid();
  client_one uuid:=gen_random_uuid();
  client_two uuid:=gen_random_uuid();
  client_three uuid:=gen_random_uuid();
  client_four uuid:=gen_random_uuid();
  client_five uuid:=gen_random_uuid();
  client_six uuid:=gen_random_uuid();
  client_seven uuid:=gen_random_uuid();
  client_eight uuid:=gen_random_uuid();
  client_nine uuid:=gen_random_uuid();
  client_ten uuid:=gen_random_uuid();
  match_one uuid:=gen_random_uuid();
  match_two uuid:=gen_random_uuid();
  match_three uuid:=gen_random_uuid();
  match_four uuid:=gen_random_uuid();
  match_five uuid:=gen_random_uuid();
  match_six uuid:=gen_random_uuid();
  match_seven uuid:=gen_random_uuid();
  material_scarf uuid:=gen_random_uuid();
  material_box uuid:=gen_random_uuid();
  material_ribbon uuid:=gen_random_uuid();
  material_pass uuid:=gen_random_uuid();
  material_bag uuid:=gen_random_uuid();
  material_pin uuid:=gen_random_uuid();
  material_card uuid:=gen_random_uuid();
  template_row record;
  match_row record;
begin
  insert into public.role_permissions(workspace_id,role,permission,allowed)
  select p_workspace_id,role_name,permission_name,
    case
      when role_name='superadmin' then true
      when role_name='admin' then permission_name<>'users_create_superadmin'
        and permission_name<>'users_manage_superadmin'
        and permission_name<>'tasks_force_complete'
        and permission_name<>'history_clear'
      when role_name='usuari' then permission_name in (
        'view_dashboard','view_matches','view_clients','view_tasks','view_stock','view_history','view_configuration',
        'backup_download','matches_create','matches_edit','matches_delete','assign_commercial','assign_client','gifts_edit',
        'clients_create','clients_edit','clients_assign','clients_delete','tasks_update','tasks_complete',
        'materials_create','stock_entry','stock_exit','stock_movement_delete','history_actor','users_view'
      )
      else permission_name in (
        'view_dashboard','view_matches','view_clients','view_tasks','view_stock','view_history','view_configuration',
        'backup_download','history_actor','users_view'
      )
    end
  from unnest(array['lector','usuari','admin','superadmin']) role_name
  cross join unnest(array[
    'view_dashboard','view_matches','view_clients','view_tasks','view_stock','view_history','view_configuration','backup_download',
    'matches_create','matches_edit','matches_delete','assign_commercial','assign_client','gifts_edit',
    'clients_create','clients_edit','clients_assign','clients_delete',
    'tasks_update','tasks_complete','tasks_force_complete',
    'materials_create','stock_entry','stock_exit','stock_movement_delete','materials_delete',
    'commercials_create','commercials_edit','commercials_delete','templates_create','templates_edit','templates_delete',
    'users_view','users_create_lector','users_create_user','users_create_admin','users_create_superadmin',
    'users_change_role','users_manage','users_manage_superadmin','history_actor','history_edit','history_clear'
  ]) permission_name
  on conflict do nothing;

  insert into public.comercials(id,workspace_id,nom,dni,telefon,correu,data_naixement,talla,nom_samarreta)
  values
    (commercial_one,p_workspace_id,'Álex Serra','DEMO-COM-001','DEMO-600-001','alex.serra@example.com','1990-04-12','M','ALEX'),
    (commercial_two,p_workspace_id,'Nora Vidal','DEMO-COM-002','DEMO-600-002','nora.vidal@example.com','1987-09-23','S','NORA'),
    (commercial_three,p_workspace_id,'Marc Soler','DEMO-COM-003','DEMO-600-003','marc.soler@example.com','1993-02-08','L','MARC'),
    (commercial_four,p_workspace_id,'Clara Ibáñez','DEMO-COM-004','DEMO-600-004','clara.ibanez@example.com','1989-06-19','M','CLARA'),
    (commercial_five,p_workspace_id,'Hugo Rivas','DEMO-COM-005','DEMO-600-005','hugo.rivas@example.com','1992-12-03','XL','HUGO');

  insert into public.clients(id,workspace_id,empresa,nom_client,comercial_id,telefon,correu,dni,nacionalitat,data_naixement,talla,nom_samarreta,notes)
  values
    (client_one,p_workspace_id,'Mediterránea Tech Demo SL','Laia Costa',commercial_one,'DEMO-700-001','laia.costa@example.com','DEMO-CLI-001','Española','1991-05-17','M','LAIA','Datos completamente ficticios.'),
    (client_two,p_workspace_id,'Levante Creativo Demo SL','Pau Ferrer',commercial_two,'DEMO-700-002','pau.ferrer@example.com','DEMO-CLI-002','Española','1988-11-02','L','PAU','Datos completamente ficticios.'),
    (client_three,p_workspace_id,'Norte Eventos Demo SL','Iris Martín',commercial_one,'DEMO-700-003','iris.martin@example.com','DEMO-CLI-003','Española','1994-01-28','S','IRIS','Datos completamente ficticios.'),
    (client_four,p_workspace_id,'Rambla Digital Demo SL','Nil Roca',commercial_three,'DEMO-700-004','nil.roca@example.com','DEMO-CLI-004','Española','1985-07-06','XL','NIL','Datos completamente ficticios.'),
    (client_five,p_workspace_id,'Horizonte Legal Demo SL','Vera Santos',commercial_four,'DEMO-700-005','vera.santos@example.com','DEMO-CLI-005','Portuguesa','1990-03-15','M','VERA','Datos completamente ficticios.'),
    (client_six,p_workspace_id,'Órbita Media Demo SL','Leo Navarro',commercial_five,'DEMO-700-006','leo.navarro@example.com','DEMO-CLI-006','Española','1986-08-21','L','LEO','Datos completamente ficticios.'),
    (client_seven,p_workspace_id,'Atlas Ingeniería Demo SA','Emma Ruiz',commercial_two,'DEMO-700-007','emma.ruiz@example.com','DEMO-CLI-007','Francesa','1992-10-09','S','EMMA','Datos completamente ficticios.'),
    (client_eight,p_workspace_id,'Costa Salud Demo SL','Bruno Gil',commercial_three,'DEMO-700-008','bruno.gil@example.com','DEMO-CLI-008','Española','1989-02-24','XXL','BRUNO','Datos completamente ficticios.'),
    (client_nine,p_workspace_id,'Vertex Consultoría Demo SL','Olivia Cano',commercial_four,'DEMO-700-009','olivia.cano@example.com','DEMO-CLI-009','Italiana','1995-07-31','M','OLIVIA','Datos completamente ficticios.'),
    (client_ten,p_workspace_id,'Prisma Retail Demo SL','Martín Vega',commercial_five,'DEMO-700-010','martin.vega@example.com','DEMO-CLI-010','Española','1987-04-04','L','MARTIN','Datos completamente ficticios.');

  insert into public.partits(id,workspace_id,rival,competicio,data,hora,estat_data,estat_partit,notes)
  values
    (match_one,p_workspace_id,'Ciudad Deportiva','Liga Demo',current_date-28,'19:00','Confirmada','Jugado','Evento sintético de demostración.'),
    (match_two,p_workspace_id,'Atlético Marina','Liga Demo',current_date-11,'18:30','Confirmada','Jugado','Evento sintético de demostración.'),
    (match_three,p_workspace_id,'Unión del Norte','Liga Demo',current_date+4,'20:00','Confirmada','Planificado','Próximo evento de demostración.'),
    (match_four,p_workspace_id,'Real Montaña','Copa Demo',current_date+10,'21:00','Confirmada','Planificado','Evento sintético de demostración.'),
    (match_five,p_workspace_id,'Sporting Central','Liga Demo',current_date+20,'18:00','Confirmada','Planificado','Evento sintético de demostración.'),
    (match_six,p_workspace_id,'Puerto Azul','Copa Demo',current_date+34,'19:30','Confirmada','Cancelado','Cancelado para mostrar los distintos estados.'),
    (match_seven,p_workspace_id,'Valle Unido','Liga Demo',current_date+49,'20:30','Provisional','Planificado','Fecha provisional de demostración.');

  insert into public.invitacions(workspace_id,partit_id,numero,comercial_id,client_id)
  values
    (p_workspace_id,match_one,1,commercial_one,client_one),
    (p_workspace_id,match_one,2,commercial_two,client_two),
    (p_workspace_id,match_two,1,commercial_three,client_three),
    (p_workspace_id,match_two,2,commercial_four,client_four),
    (p_workspace_id,match_three,1,commercial_one,client_five),
    (p_workspace_id,match_three,2,commercial_five,client_six),
    (p_workspace_id,match_four,1,commercial_two,client_seven),
    (p_workspace_id,match_four,2,commercial_three,client_eight),
    (p_workspace_id,match_five,1,commercial_four,client_nine),
    (p_workspace_id,match_five,2,commercial_five,client_ten),
    (p_workspace_id,match_six,1,commercial_one,client_three),
    (p_workspace_id,match_six,2,commercial_four,client_seven),
    (p_workspace_id,match_seven,1,commercial_two,client_one),
    (p_workspace_id,match_seven,2,commercial_five,client_nine);

  insert into public.task_templates(workspace_id,nom,grup,dies_offset,estat_correcte,tipus,ordre,estats,responsable)
  values
    (p_workspace_id,'Confirmar asistencia','Pre partido',-7,'Confirmada','estat',10,array['Pendiente','Contactado','Confirmada'],'Lucía Martín'),
    (p_workspace_id,'Validar datos del invitado','Datos',-6,'Validado','estat',20,array['Pendiente','En revisión','Validado'],'Diego Ruiz'),
    (p_workspace_id,'Revisar talla de camiseta','Datos',-5,'Validada','estat',30,array['Pendiente','Consultada','Validada'],'Elena Soto'),
    (p_workspace_id,'Preparar acreditación','Pre partido',-3,'Preparada','estat',40,array['Pendiente','En preparación','Preparada'],'Lucía Martín'),
    (p_workspace_id,'Preparar obsequio VIP','Regalos',-2,'Preparado','estat',50,array['No preparado','Preparándose','Preparado'],'Diego Ruiz'),
    (p_workspace_id,'Confirmar documentación','Pre partido',-1,'Confirmada','estat',60,array['Pendiente','En revisión','Confirmada'],'Elena Soto'),
    (p_workspace_id,'Registrar entrega de regalos','Regalos',0,'Entregado','estat',70,array['Pendiente','Preparado','Entregado'],'Lucía Martín'),
    (p_workspace_id,'Confirmar recepción','Post partido',1,'Confirmada','estat',80,array['Pendiente','Confirmada'],'Diego Ruiz');

  for match_row in
    select i.id as invitation_id,i.partit_id,p.data
    from public.invitacions i join public.partits p on p.id=i.partit_id
    where i.workspace_id=p_workspace_id
  loop
    for template_row in
      select * from public.task_templates
      where workspace_id=p_workspace_id and activa=true
    loop
      insert into public.tasks(
        workspace_id,partit_id,invitacio_id,template_id,nom,grup,data_limit,
        estat_actual,estat_correcte,completada
      ) values (
        p_workspace_id,match_row.partit_id,match_row.invitation_id,template_row.id,
        template_row.nom,template_row.grup,match_row.data+coalesce(template_row.dies_offset,0),
        case when match_row.data<current_date then template_row.estat_correcte else template_row.estats[1] end,
        template_row.estat_correcte,
        match_row.data<current_date
      );
    end loop;
  end loop;

  update public.tasks
  set estat_actual=estat_correcte,completada=true,updated_at=now()-interval '1 day'
  where workspace_id=p_workspace_id
    and partit_id=match_three
    and nom in ('Confirmar asistencia','Validar datos del invitado','Revisar talla de camiseta');

  update public.tasks
  set estat_actual='En preparación',updated_at=now()-interval '4 hours'
  where workspace_id=p_workspace_id
    and partit_id=match_three
    and nom='Preparar acreditación';

  insert into public.materials(id,workspace_id,nom,quantitat)
  values
    (material_scarf,p_workspace_id,'Bufandas',24),
    (material_box,p_workspace_id,'Cajas de regalo',18),
    (material_ribbon,p_workspace_id,'Lazos',4),
    (material_pass,p_workspace_id,'Acreditaciones',16),
    (material_bag,p_workspace_id,'Bolsas premium',10),
    (material_pin,p_workspace_id,'Pines conmemorativos',3),
    (material_card,p_workspace_id,'Tarjetas de bienvenida',30);

  insert into public.stock_movements(workspace_id,material_id,tipus,unitats,created_at)
  values
    (p_workspace_id,material_scarf,'Entrada',24,now()-interval '12 days'),
    (p_workspace_id,material_box,'Entrada',18,now()-interval '12 days'),
    (p_workspace_id,material_ribbon,'Entrada',4,now()-interval '10 days'),
    (p_workspace_id,material_pass,'Entrada',16,now()-interval '9 days'),
    (p_workspace_id,material_bag,'Entrada',10,now()-interval '8 days'),
    (p_workspace_id,material_pin,'Entrada',3,now()-interval '7 days'),
    (p_workspace_id,material_card,'Entrada',30,now()-interval '6 days');

  delete from public.audit_log where workspace_id=p_workspace_id;
end;
$$;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  target_workspace uuid;
  target_role text;
  target_name text;
  pending public.pending_invites%rowtype;
begin
  if new.email is not null then
    select * into pending
    from public.pending_invites pi
    where lower(pi.email)=lower(new.email) and pi.expires_at>now()
    order by pi.created_at desc
    limit 1;
  end if;

  if pending.id is not null then
    target_workspace:=pending.workspace_id;
    target_role:=pending.rol;
    target_name:=coalesce(pending.nom,new.raw_user_meta_data->>'nom',new.email);
    delete from public.pending_invites where id=pending.id;
  else
    insert into public.workspaces(name,owner_user_id)
    values ('Entorno demo '||upper(substr(new.id::text,1,6)),new.id)
    returning id into target_workspace;
    target_role:='superadmin';
    target_name:=coalesce(new.raw_user_meta_data->>'nom',new.email,'Visitante demo');
  end if;

  insert into public.profiles(id,workspace_id,email,nom,rol,actiu)
  values(new.id,target_workspace,new.email,target_name,target_role,true)
  on conflict(id) do nothing;

  if target_role='superadmin' and not exists(
    select 1 from public.partits where workspace_id=target_workspace
  ) then
    perform public.seed_demo_workspace(target_workspace);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  old_row jsonb;
  new_row jsonb;
  record_id text;
  tenant_id uuid;
begin
  old_row:=case when tg_op='INSERT' then null else to_jsonb(old) end;
  new_row:=case when tg_op='DELETE' then null else to_jsonb(new) end;
  if tg_op='UPDATE' and (old_row-'updated_at')=(new_row-'updated_at') then return new; end if;
  tenant_id:=coalesce((new_row->>'workspace_id')::uuid,(old_row->>'workspace_id')::uuid);
  record_id:=coalesce(new_row->>'id',old_row->>'id','');
  insert into public.audit_log(workspace_id,user_id,taula,registre_id,accio,detall)
  values(tenant_id,auth.uid(),tg_table_name,record_id,lower(tg_op),jsonb_build_object('old',old_row,'new',new_row));
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create or replace function public.set_role_permission_metadata()
returns trigger language plpgsql set search_path='public' as $$
begin new.updated_at=now(); new.updated_by=auth.uid(); return new; end;
$$;

create or replace function public.audit_role_permission_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_row public.role_permissions;
begin
  v_row:=case when tg_op='DELETE' then old else new end;
  if tg_op='UPDATE' and old.allowed is not distinct from new.allowed then return new; end if;
  insert into public.audit_log(workspace_id,user_id,taula,registre_id,accio,detall)
  values(v_row.workspace_id,auth.uid(),'role_permissions',v_row.role||':'||v_row.permission,
    case when tg_op='DELETE' then 'DELETE' else 'UPDATE' end,
    jsonb_build_object('rol',v_row.role,'permis',v_row.permission,'abans',case when tg_op='INSERT' then null else old.allowed end,'despres',case when tg_op='DELETE' then null else new.allowed end));
  return case when tg_op='DELETE' then old else new end;
end;
$$;

create or replace function public.initialize_gift_task_state()
returns trigger language plpgsql set search_path='public' as $$
declare initial_state text;
begin
  if coalesce(btrim(new.estat_actual),'')='' then
    select tt.estats[1] into initial_state from public.task_templates tt
    where tt.id=new.template_id and tt.workspace_id=new.workspace_id and tt.grup='Regalos' and tt.tipus='estat';
    if coalesce(btrim(initial_state),'')<>'' then new.estat_actual:=initial_state; end if;
  end if;
  return new;
end;
$$;

create or replace function public.require_client_for_completed_task()
returns trigger language plpgsql security definer set search_path='' as $$
declare assigned_client uuid; is_commercial_assignment boolean:=false;
begin
  if new.completada_manual=true then new.completada:=true; return new; end if;
  if new.completada=true then
    select i.client_id,coalesce(t.tipus='camp_comercial' and t.camp_comercial='__assigned__',false)
    into assigned_client,is_commercial_assignment
    from public.invitacions i left join public.task_templates t
      on t.id=new.template_id and t.workspace_id=new.workspace_id
    where i.id=new.invitacio_id and i.workspace_id=new.workspace_id;
    if assigned_client is null and not is_commercial_assignment then
      raise exception 'Primero hay que asignar o crear el cliente.' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.reopen_tasks_without_client()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.client_id is not null and new.client_id is null then
    update public.tasks set completada=false,updated_at=now()
    where workspace_id=new.workspace_id and invitacio_id=new.id
      and completada=true and completada_manual is not true;
  end if;
  return new;
end;
$$;

create or replace function public.protect_manual_task_completion()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.completada_manual is distinct from old.completada_manual and auth.uid() is not null then
    if not exists(
      select 1 from public.profiles p
      where p.id=auth.uid() and p.workspace_id=new.workspace_id and p.rol='superadmin' and p.actiu=true
    ) then raise exception 'Només el superadmin pot modificar completada_manual'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.touch_last_access()
returns void language plpgsql security definer set search_path='' as $$
declare tenant_id uuid:=public.current_workspace_id();
begin
  if auth.uid() is null or tenant_id is null then raise exception 'No autenticado' using errcode='42501'; end if;
  insert into public.user_access(user_id,workspace_id,last_access_at)
  values(auth.uid(),tenant_id,now())
  on conflict(user_id) do update set workspace_id=excluded.workspace_id,last_access_at=excluded.last_access_at;
  update public.workspaces set last_active_at=now() where id=tenant_id;
end;
$$;

create or replace function public.clear_audit_log(p_from timestamptz default null,p_to timestamptz default null)
returns bigint language plpgsql security definer set search_path='' as $$
declare deleted_rows bigint; tenant_id uuid:=public.current_workspace_id();
begin
  if not public.has_permission('history_clear') then raise exception 'No tienes permiso para borrar el historial' using errcode='42501'; end if;
  delete from public.audit_log h where h.workspace_id=tenant_id
    and (p_from is null or h.created_at>=p_from) and (p_to is null or h.created_at<=p_to);
  get diagnostics deleted_rows=row_count; return deleted_rows;
end;
$$;

create or replace function public.reset_demo_workspace()
returns void language plpgsql security definer set search_path='' as $$
declare tenant_id uuid:=public.current_workspace_id();
begin
  if tenant_id is null or not public.is_superadmin() then raise exception 'No autorizado' using errcode='42501'; end if;
  delete from public.stock_movements where workspace_id=tenant_id;
  delete from public.tasks where workspace_id=tenant_id;
  delete from public.invitacions where workspace_id=tenant_id;
  delete from public.clients where workspace_id=tenant_id;
  delete from public.comercials where workspace_id=tenant_id;
  delete from public.partits where workspace_id=tenant_id;
  delete from public.materials where workspace_id=tenant_id;
  delete from public.task_templates where workspace_id=tenant_id;
  delete from public.role_permissions where workspace_id=tenant_id;
  delete from public.audit_log where workspace_id=tenant_id;
  perform public.seed_demo_workspace(tenant_id);
  delete from public.audit_log where workspace_id=tenant_id;
end;
$$;

create trigger role_permissions_metadata before insert or update on public.role_permissions
for each row execute function public.set_role_permission_metadata();
create trigger role_permissions_audit after insert or update or delete on public.role_permissions
for each row execute function public.audit_role_permission_change();
create trigger initialize_gift_task_state_before_insert before insert on public.tasks
for each row execute function public.initialize_gift_task_state();
create trigger require_client_for_completed_task before insert or update on public.tasks
for each row execute function public.require_client_for_completed_task();
create trigger protect_manual_task_completion before update on public.tasks
for each row execute function public.protect_manual_task_completion();
create trigger reopen_tasks_without_client after update on public.invitacions
for each row execute function public.reopen_tasks_without_client();

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','comercials','invitacions','materials','partits','stock_movements','task_templates','tasks']
  loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row_change()',
      'audit_' || table_name,
      table_name
    );
  end loop;
end $$;

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.pending_invites enable row level security;
alter table public.comercials enable row level security;
alter table public.clients enable row level security;
alter table public.partits enable row level security;
alter table public.invitacions enable row level security;
alter table public.task_templates enable row level security;
alter table public.tasks enable row level security;
alter table public.materials enable row level security;
alter table public.stock_movements enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_log enable row level security;
alter table public.backup_downloads enable row level security;
alter table public.user_access enable row level security;

create policy workspaces_select on public.workspaces for select to authenticated using(id=public.current_workspace_id());
create policy workspaces_update on public.workspaces for update to authenticated
  using(id=public.current_workspace_id() and public.is_superadmin())
  with check(id=public.current_workspace_id() and public.is_superadmin());

create policy profiles_select on public.profiles for select to authenticated using(workspace_id=public.current_workspace_id());
create policy profiles_insert on public.profiles for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using(workspace_id=public.current_workspace_id() and public.is_admin())
  with check(workspace_id=public.current_workspace_id() and public.is_admin());
create policy profiles_delete on public.profiles for delete to authenticated using(workspace_id=public.current_workspace_id() and public.is_admin());

create policy role_permissions_select on public.role_permissions for select to authenticated using(workspace_id=public.current_workspace_id());
create policy role_permissions_insert on public.role_permissions for insert to authenticated
  with check(workspace_id=public.current_workspace_id() and public.is_superadmin() and role<>'superadmin');
create policy role_permissions_update on public.role_permissions for update to authenticated
  using(workspace_id=public.current_workspace_id() and public.is_superadmin() and role<>'superadmin')
  with check(workspace_id=public.current_workspace_id() and public.is_superadmin() and role<>'superadmin');
create policy role_permissions_delete on public.role_permissions for delete to authenticated
  using(workspace_id=public.current_workspace_id() and public.is_superadmin() and role<>'superadmin');

create policy clients_select on public.clients for select to authenticated using(workspace_id=public.current_workspace_id());
create policy clients_insert on public.clients for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('clients_create'));
create policy clients_update on public.clients for update to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('clients_edit')) with check(workspace_id=public.current_workspace_id() and public.has_permission('clients_edit'));
create policy clients_delete on public.clients for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('clients_delete'));

create policy comercials_select on public.comercials for select to authenticated using(workspace_id=public.current_workspace_id());
create policy comercials_insert on public.comercials for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('commercials_create'));
create policy comercials_update on public.comercials for update to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('commercials_edit') or public.has_permission('commercials_delete'))) with check(workspace_id=public.current_workspace_id() and (public.has_permission('commercials_edit') or public.has_permission('commercials_delete')));
create policy comercials_delete on public.comercials for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('commercials_delete'));

create policy partits_select on public.partits for select to authenticated using(workspace_id=public.current_workspace_id());
create policy partits_insert on public.partits for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('matches_create'));
create policy partits_update on public.partits for update to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('matches_edit')) with check(workspace_id=public.current_workspace_id() and public.has_permission('matches_edit'));
create policy partits_delete on public.partits for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('matches_delete'));

create policy invitacions_select on public.invitacions for select to authenticated using(workspace_id=public.current_workspace_id());
create policy invitacions_insert on public.invitacions for insert to authenticated with check(workspace_id=public.current_workspace_id() and (public.has_permission('matches_create') or public.has_permission('assign_commercial') or public.has_permission('assign_client')));
create policy invitacions_update on public.invitacions for update to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('matches_edit') or public.has_permission('assign_commercial') or public.has_permission('assign_client') or public.has_permission('clients_assign') or public.has_permission('clients_delete') or public.has_permission('commercials_delete'))) with check(workspace_id=public.current_workspace_id());
create policy invitacions_delete on public.invitacions for delete to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('matches_delete') or public.has_permission('assign_commercial') or public.has_permission('assign_client')));

create policy templates_select on public.task_templates for select to authenticated using(workspace_id=public.current_workspace_id());
create policy templates_insert on public.task_templates for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('templates_create'));
create policy templates_update on public.task_templates for update to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('templates_edit')) with check(workspace_id=public.current_workspace_id() and public.has_permission('templates_edit'));
create policy templates_delete on public.task_templates for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('templates_delete'));

create policy tasks_select on public.tasks for select to authenticated using(workspace_id=public.current_workspace_id());
create policy tasks_insert on public.tasks for insert to authenticated with check(workspace_id=public.current_workspace_id() and (public.has_permission('matches_create') or public.has_permission('templates_create') or public.has_permission('templates_edit')));
create policy tasks_update on public.tasks for update to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('tasks_update') or public.has_permission('tasks_complete') or public.has_permission('tasks_force_complete') or public.has_permission('gifts_edit') or public.has_permission('matches_edit') or public.has_permission('templates_edit') or public.has_permission('clients_edit') or public.has_permission('clients_assign') or public.has_permission('assign_client') or public.has_permission('assign_commercial'))) with check(workspace_id=public.current_workspace_id());
create policy tasks_delete on public.tasks for delete to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('matches_delete') or public.has_permission('templates_delete')));

create policy materials_select on public.materials for select to authenticated using(workspace_id=public.current_workspace_id());
create policy materials_insert on public.materials for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('materials_create'));
create policy materials_update on public.materials for update to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('materials_create') or public.has_permission('stock_entry') or public.has_permission('stock_exit') or public.has_permission('stock_movement_delete'))) with check(workspace_id=public.current_workspace_id());
create policy materials_delete on public.materials for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('materials_delete'));

create policy movements_select on public.stock_movements for select to authenticated using(workspace_id=public.current_workspace_id());
create policy movements_insert on public.stock_movements for insert to authenticated with check(workspace_id=public.current_workspace_id() and ((tipus='Entrada' and public.has_permission('stock_entry')) or (tipus='Salida' and public.has_permission('stock_exit'))));
create policy movements_update on public.stock_movements for update to authenticated using(workspace_id=public.current_workspace_id() and (public.has_permission('stock_entry') or public.has_permission('stock_exit'))) with check(workspace_id=public.current_workspace_id());
create policy movements_delete on public.stock_movements for delete to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('stock_movement_delete'));

create policy audit_select on public.audit_log for select to authenticated using(workspace_id=public.current_workspace_id());
create policy backup_select on public.backup_downloads for select to authenticated using(workspace_id=public.current_workspace_id());
create policy backup_insert on public.backup_downloads for insert to authenticated with check(workspace_id=public.current_workspace_id() and public.has_permission('backup_download'));
create policy access_select on public.user_access for select to authenticated using(workspace_id=public.current_workspace_id() and public.has_permission('users_view'));

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage,select on all sequences in schema public to authenticated;
revoke all on function public.seed_demo_workspace(uuid) from public,anon,authenticated;
grant execute on function public.current_workspace_id() to authenticated;
grant execute on function public.has_active_profile() to authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.touch_last_access() to authenticated;
grant execute on function public.clear_audit_log(timestamptz,timestamptz) to authenticated;
grant execute on function public.reset_demo_workspace() to authenticated;

do $$
declare table_name text;
begin
  foreach table_name in array array['clients','comercials','invitacions','materials','partits','stock_movements','task_templates','tasks','role_permissions']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I',table_name);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
