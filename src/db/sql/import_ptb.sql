-- Transactional PTB Import Function v2
-- Counts ALL processed records (inserts + updates)
--
-- Usage: supabase.rpc('import_ptb_v1', { p_company_id: '...', p_data: { ... } })

create or replace function import_ptb_v1(p_company_id text, p_data jsonb)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_rec jsonb;
  v_exist_id text;
  v_c_cnt int := 0;
  v_v_cnt int := 0;
  v_a_cnt int := 0;
  v_e_cnt int := 0;
  v_t_cnt int := 0;
  v_i_cnt int := 0;
begin
  -- 1. Customers
  if p_data ? 'customers' then
    for v_rec in select * from jsonb_array_elements(p_data->'customers') loop
      select id into v_exist_id from customers 
      where company_id = p_company_id and customer_number = (v_rec->>'id');

      if v_exist_id is not null then
        update customers 
        set name = (v_rec->>'name'),
            email = coalesce(v_rec->>'email', email),
            phone = coalesce(v_rec->>'phone', phone),
            updated_at = now()
        where id = v_exist_id;
      else
        insert into customers (
          id, company_id, customer_number, name, email, phone, 
          customer_type, payment_terms, is_active, balance
        ) values (
          gen_random_uuid(), p_company_id, 
          v_rec->>'id', v_rec->>'name', v_rec->>'email', v_rec->>'phone',
          'CORPORATE', 'NET_30', true, 0
        );
      end if;
      v_c_cnt := v_c_cnt + 1;  -- Count ALL (insert + update)
    end loop;
  end if;

  -- 2. Vendors
  if p_data ? 'vendors' then
    for v_rec in select * from jsonb_array_elements(p_data->'vendors') loop
      select id into v_exist_id from vendors 
      where company_id = p_company_id and vendor_number = (v_rec->>'id');

      if v_exist_id is not null then
        update vendors 
        set name = (v_rec->>'name'),
            email = coalesce(v_rec->>'email', email),
            phone = coalesce(v_rec->>'phone', phone),
            updated_at = now()
        where id = v_exist_id;
      else
        insert into vendors (
          id, company_id, vendor_number, name, email, phone, 
          vendor_type, payment_terms, is_active, balance
        ) values (
          gen_random_uuid(), p_company_id, 
          v_rec->>'id', v_rec->>'name', v_rec->>'email', v_rec->>'phone',
          'SUPPLIER', 'NET_30', true, 0
        );
      end if;
      v_v_cnt := v_v_cnt + 1;  -- Count ALL
    end loop;
  end if;

  -- 3. Accounts
  if p_data ? 'accounts' then
    for v_rec in select * from jsonb_array_elements(p_data->'accounts') loop
      select id into v_exist_id from chart_of_accounts 
      where company_id = p_company_id and account_number = (v_rec->>'accountNumber');

      if v_exist_id is not null then
        update chart_of_accounts 
        set account_name = (v_rec->>'accountName'),
            type = (v_rec->>'type')::account_type
        where id = v_exist_id;
      else
        insert into chart_of_accounts (
          id, company_id, account_number, account_name, type, balance, is_active
        ) values (
          gen_random_uuid(), p_company_id, 
          v_rec->>'accountNumber', v_rec->>'accountName', 
          (v_rec->>'type')::account_type, 0, true
        );
      end if;
      v_a_cnt := v_a_cnt + 1;
    end loop;
  end if;

  -- 4. Employees
  if p_data ? 'employees' then
    for v_rec in select * from jsonb_array_elements(p_data->'employees') loop
      select id into v_exist_id from employees 
      where company_id = p_company_id and employee_code = (v_rec->>'id');

      if v_exist_id is not null then
        update employees set updated_at = now() where id = v_exist_id;
      else
        insert into employees (
          id, company_id, employee_code, first_name, last_name, 
          email, phone, job_title, department, is_active
        ) values (
          gen_random_uuid(), p_company_id, 
          v_rec->>'id', 
          split_part(v_rec->>'name', ' ', 1), 
          coalesce(nullif(substring(v_rec->>'name' from strpos(v_rec->>'name', ' ')+1), ''), '.'),
          v_rec->>'email', v_rec->>'phone',
          v_rec->>'position', v_rec->>'department', true
        );
      end if;
      v_e_cnt := v_e_cnt + 1;
    end loop;
  end if;

  -- 5. Inventory
  if p_data ? 'inventoryItems' then
    for v_rec in select * from jsonb_array_elements(p_data->'inventoryItems') loop
      select id into v_exist_id from items 
      where company_id = p_company_id and sku = (v_rec->>'itemCode');

      if v_exist_id is not null then
        update items 
        set name = (v_rec->>'itemName'),
            description = (v_rec->>'description'),
            updated_at = now()
        where id = v_exist_id;
      else
        insert into items (
          id, company_id, sku, name, description, unit_of_measure,
          cost_price, selling_price, quantity_on_hand, is_active
        ) values (
          gen_random_uuid(), p_company_id,
          v_rec->>'itemCode', v_rec->>'itemName', v_rec->>'description',
          'PCS', coalesce((v_rec->>'costPrice')::numeric, 0),
          coalesce((v_rec->>'unitPrice')::numeric, 0),
          coalesce((v_rec->>'quantity')::numeric, 0), true
        );
      end if;
      v_i_cnt := v_i_cnt + 1;
    end loop;
  end if;

  -- 6. Journal Entries (insert only, no updates)
  if p_data ? 'journalEntries' then
    for v_rec in select * from jsonb_array_elements(p_data->'journalEntries') loop
      if (v_rec->>'entryId') is not null then
        select id into v_exist_id from journal_entries
        where company_id = p_company_id and reference = (v_rec->>'entryId');

        if v_exist_id is null then
          insert into journal_entries (
            id, company_id, date, description, reference, status, source_type
          ) values (
            gen_random_uuid(), p_company_id,
            coalesce((v_rec->>'date')::timestamp, now()),
            coalesce(v_rec->>'description', 'Imported Transaction'),
            v_rec->>'entryId', 'POSTED', 'MANUAL'
          );
          v_t_cnt := v_t_cnt + 1;
        end if;
      end if;
    end loop;
  end if;

  -- Return Summary
  return jsonb_build_object(
    'success', true,
    'counts', jsonb_build_object(
      'customers', v_c_cnt,
      'vendors', v_v_cnt,
      'accounts', v_a_cnt,
      'employees', v_e_cnt,
      'inventory', v_i_cnt,
      'transactions', v_t_cnt
    )
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;
