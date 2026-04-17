CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  supabase_url text;
  internal_secret text;
  anon_key text;
  request_id bigint;
begin
  -- Insert the profile row
  insert into public.profiles (
    id,
    first_name,
    dob,
    country,
    gender,
    referral_source,
    onboarding_completed,
    fbp,
    fbc,
    ip_address,
    user_agent
  )
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    (new.raw_user_meta_data ->> 'dob')::date,
    new.raw_user_meta_data ->> 'country',
    new.raw_user_meta_data ->> 'gender',
    new.raw_user_meta_data ->> 'referral_source',
    coalesce(
      (new.raw_user_meta_data ->> 'onboarding_completed')::boolean,
      false
    ),
    new.raw_user_meta_data ->> 'fbp',
    new.raw_user_meta_data ->> 'fbc',
    new.raw_user_meta_data ->> 'ip_address',
    new.raw_user_meta_data ->> 'user_agent'
  );

  -- Call internal edge functions via pg_net
  supabase_url := current_setting('app.settings.supabase_url', true);
  internal_secret := current_setting('app.settings.internal_secret', true);
  anon_key := current_setting('app.settings.anon_key', true);

  if supabase_url is not null and internal_secret is not null and anon_key is not null then
    select net.http_post(
      url := supabase_url || '/functions/v1/resend-contact-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'x-internal-secret', internal_secret
      ),
      body := jsonb_build_object(
        'email', new.email,
        'first_name', new.raw_user_meta_data ->> 'first_name'
      )
    ) into request_id;

    select net.http_post(
      url := supabase_url || '/functions/v1/meta-complete-registration',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key,
        'x-internal-secret', internal_secret
      ),
      body := jsonb_build_object(
        'email', new.email,
        'profile_id', new.id,
        'client_ip_address', new.raw_user_meta_data ->> 'ip_address',
        'client_user_agent', new.raw_user_meta_data ->> 'user_agent',
        'fbp', new.raw_user_meta_data ->> 'fbp',
        'fbc', new.raw_user_meta_data ->> 'fbc',
        'country', new.raw_user_meta_data ->> 'country'
      )
    ) into request_id;
  end if;

  return new;
end;
$function$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();
