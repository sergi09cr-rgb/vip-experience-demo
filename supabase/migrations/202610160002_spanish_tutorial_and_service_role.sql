-- Traducción completa de la demo y permisos del cliente administrativo.
-- Mantiene los valores persistidos alineados con la interfaz en castellano.

grant usage on schema public to service_role;
grant select,insert,update,delete on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;

alter default privileges for role postgres in schema public
  grant select,insert,update,delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage,select on sequences to service_role;

alter table public.partits disable trigger user;
alter table public.task_templates disable trigger user;
alter table public.tasks disable trigger user;
alter table public.stock_movements disable trigger user;
alter table public.clients disable trigger user;
alter table public.materials disable trigger user;

alter table public.partits drop constraint if exists partits_estat_data_check;
alter table public.partits drop constraint if exists partits_estat_partit_check;
alter table public.stock_movements drop constraint if exists stock_movements_tipus_check;
alter table public.stock_movements drop constraint if exists stock_movements_check;

alter table public.partits alter column estat_data set default 'Pendiente';
alter table public.partits alter column estat_partit set default 'Planificado';

update public.partits
set
  estat_data=case estat_data
    when 'Pendent' then 'Pendiente'
    else estat_data
  end,
  estat_partit=case estat_partit
    when 'Planificat' then 'Planificado'
    when 'Jugat' then 'Jugado'
    when 'Cancel·lat' then 'Cancelado'
    else estat_partit
  end,
  competicio=case competicio
    when 'Lliga Demo' then 'Liga Demo'
    else competicio
  end,
  rival=case rival
    when 'Atlètic Marina' then 'Atlético Marina'
    when 'Unió del Nord' then 'Unión del Norte'
    when 'Ciutat Esportiva' then 'Ciudad Deportiva'
    else rival
  end,
  notes=case notes
    when 'Esdeveniment sintètic de demostració.' then 'Evento sintético de demostración.'
    else notes
  end;

update public.task_templates
set
  nom=case nom
    when 'Confirmar assistència' then 'Confirmar asistencia'
    when 'Validar dades del convidat' then 'Validar datos del invitado'
    when 'Preparar acreditació' then 'Preparar acreditación'
    when 'Entregar obsequi VIP' then 'Entregar obsequio VIP'
    when 'Confirmar recepció' then 'Confirmar recepción'
    when 'Formulari' then 'Formulario'
    else nom
  end,
  grup=case grup
    when 'Dades' then 'Datos'
    when 'Regals' then 'Regalos'
    when 'Pre partit' then 'Pre partido'
    when 'Post partit' then 'Post partido'
    else grup
  end,
  estat_correcte=case estat_correcte
    when 'Pendent' then 'Pendiente'
    when 'Contactat' then 'Contactado'
    when 'Validat' then 'Validado'
    when 'En revisió' then 'En revisión'
    when 'En preparació' then 'En preparación'
    when 'Preparat' then 'Preparado'
    when 'Entregat' then 'Entregado'
    when 'No enviat' then 'No enviado'
    when 'Enviat' then 'Enviado'
    when 'Respost' then 'Respondido'
    when 'No rebut' then 'No recibido'
    when 'Rebut' then 'Recibido'
    else estat_correcte
  end,
  estats=array(
    select case value
      when 'Pendent' then 'Pendiente'
      when 'Contactat' then 'Contactado'
      when 'Validat' then 'Validado'
      when 'En revisió' then 'En revisión'
      when 'En preparació' then 'En preparación'
      when 'Preparat' then 'Preparado'
      when 'Entregat' then 'Entregado'
      when 'No enviat' then 'No enviado'
      when 'Enviat' then 'Enviado'
      when 'Respost' then 'Respondido'
      when 'No rebut' then 'No recibido'
      when 'Rebut' then 'Recibido'
      else value
    end
    from unnest(estats) as value
  );

update public.tasks
set
  nom=case nom
    when 'Confirmar assistència' then 'Confirmar asistencia'
    when 'Validar dades del convidat' then 'Validar datos del invitado'
    when 'Preparar acreditació' then 'Preparar acreditación'
    when 'Entregar obsequi VIP' then 'Entregar obsequio VIP'
    when 'Confirmar recepció' then 'Confirmar recepción'
    when 'Formulari' then 'Formulario'
    else nom
  end,
  grup=case grup
    when 'Dades' then 'Datos'
    when 'Regals' then 'Regalos'
    when 'Pre partit' then 'Pre partido'
    when 'Post partit' then 'Post partido'
    else grup
  end,
  estat_actual=case estat_actual
    when 'Pendent' then 'Pendiente'
    when 'Contactat' then 'Contactado'
    when 'Validat' then 'Validado'
    when 'En revisió' then 'En revisión'
    when 'En preparació' then 'En preparación'
    when 'Preparat' then 'Preparado'
    when 'Entregat' then 'Entregado'
    when 'No enviat' then 'No enviado'
    when 'Enviat' then 'Enviado'
    when 'Respost' then 'Respondido'
    when 'No rebut' then 'No recibido'
    when 'Rebut' then 'Recibido'
    else estat_actual
  end,
  estat_correcte=case estat_correcte
    when 'Pendent' then 'Pendiente'
    when 'Contactat' then 'Contactado'
    when 'Validat' then 'Validado'
    when 'En revisió' then 'En revisión'
    when 'En preparació' then 'En preparación'
    when 'Preparat' then 'Preparado'
    when 'Entregat' then 'Entregado'
    when 'No enviat' then 'No enviado'
    when 'Enviat' then 'Enviado'
    when 'Respost' then 'Respondido'
    when 'No rebut' then 'No recibido'
    when 'Rebut' then 'Recibido'
    else estat_correcte
  end;

update public.stock_movements
set tipus='Salida'
where tipus='Sortida';

update public.clients
set
  empresa=case empresa
    when 'Mediterrània Tech Demo SL' then 'Mediterránea Tech Demo SL'
    when 'Llevant Creatiu Demo SL' then 'Levante Creativo Demo SL'
    else empresa
  end,
  nacionalitat=case nacionalitat
    when 'Espanyola' then 'Española'
    else nacionalitat
  end,
  notes=case notes
    when 'Dades completament fictícies.' then 'Datos completamente ficticios.'
    else notes
  end;

update public.materials
set nom=case nom
  when 'Caixes' then 'Cajas'
  when 'Llaços' then 'Lazos'
  else nom
end;

update public.workspaces
set name=replace(name,'Entorn demo ','Entorno demo ')
where name like 'Entorn demo %';

alter table public.partits add constraint partits_estat_data_check
  check (estat_data in ('Pendiente','Provisional','Confirmada'));
alter table public.partits add constraint partits_estat_partit_check
  check (estat_partit in ('Planificado','Jugado','Cancelado'));
alter table public.stock_movements add constraint stock_movements_tipus_check
  check (tipus in ('Entrada','Salida'));
alter table public.stock_movements add constraint stock_movements_note_check
  check (tipus='Salida' or nota is null);

alter table public.partits enable trigger user;
alter table public.task_templates enable trigger user;
alter table public.tasks enable trigger user;
alter table public.stock_movements enable trigger user;
alter table public.clients enable trigger user;
alter table public.materials enable trigger user;

do $translate_audit$
declare
  translation text[];
begin
  foreach translation slice 1 in array array[
    ['Pendent','Pendiente'],
    ['Planificat','Planificado'],
    ['Jugat','Jugado'],
    ['Cancel·lat','Cancelado'],
    ['Sortida','Salida'],
    ['Regals','Regalos'],
    ['Dades','Datos'],
    ['Pre partit','Pre partido'],
    ['Post partit','Post partido'],
    ['Contactat','Contactado'],
    ['Validat','Validado'],
    ['En revisió','En revisión'],
    ['En preparació','En preparación'],
    ['Preparat','Preparado'],
    ['Entregat','Entregado']
  ]
  loop
    update public.audit_log
    set detall=replace(
      detall::text,
      to_jsonb(translation[1])::text,
      to_jsonb(translation[2])::text
    )::jsonb
    where detall::text like '%' || translation[1] || '%';
  end loop;
end
$translate_audit$;

update public.audit_log
set accio=case accio
  when 'usuari_creat' then 'usuario_creado'
  when 'usuari_actualitzat' then 'usuario_actualizado'
  when 'usuari_eliminat' then 'usuario_eliminado'
  else accio
end
where accio in ('usuari_creat','usuari_actualitzat','usuari_eliminat');

drop policy if exists movements_insert on public.stock_movements;
create policy movements_insert on public.stock_movements for insert to authenticated
  with check(
    workspace_id=public.current_workspace_id()
    and (
      (tipus='Entrada' and public.has_permission('stock_entry'))
      or
      (tipus='Salida' and public.has_permission('stock_exit'))
    )
  );

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

-- Actualiza los entornos que todavía conservan el conjunto inicial reducido.
-- Los entornos ya ampliados o personalizados no se modifican.
do $reseed_sparse_demo_workspaces$
declare
  demo_workspace record;
begin
  for demo_workspace in
    select w.id
    from public.workspaces w
    where (select count(*) from public.partits p where p.workspace_id=w.id)<=3
      and (select count(*) from public.clients c where c.workspace_id=w.id)<=4
  loop
    delete from public.stock_movements where workspace_id=demo_workspace.id;
    delete from public.tasks where workspace_id=demo_workspace.id;
    delete from public.invitacions where workspace_id=demo_workspace.id;
    delete from public.clients where workspace_id=demo_workspace.id;
    delete from public.comercials where workspace_id=demo_workspace.id;
    delete from public.partits where workspace_id=demo_workspace.id;
    delete from public.materials where workspace_id=demo_workspace.id;
    delete from public.task_templates where workspace_id=demo_workspace.id;
    delete from public.role_permissions where workspace_id=demo_workspace.id;
    delete from public.audit_log where workspace_id=demo_workspace.id;
    perform public.seed_demo_workspace(demo_workspace.id);
    delete from public.audit_log where workspace_id=demo_workspace.id;
  end loop;
end
$reseed_sparse_demo_workspaces$;


notify pgrst,'reload schema';

