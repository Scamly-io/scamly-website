
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
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

  -- Call resend-contact-sync edge function via pg_net
  select net.http_post(
    url := 'https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/resend-contact-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcnVtY2p3bnR5Zm5qaG93bmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2OTU3MzEsImV4cCI6MjA2MjI3MTczMX0.axhI-Icvl60tN1oYeyJ70z_6dgz1bdFTpLKW_NGTN_M',
      'x-internal-secret', 'oZXjC20T32nuy1thgGTZSDCtrG0kTYnC--Idwzo2FImt0s1lP2yCK6uMN6LgZjszMl'
    ),
    body := jsonb_build_object(
      'email', new.email,
      'first_name', new.raw_user_meta_data ->> 'first_name'
    )
  ) into request_id;

  return new;
end;
$function$;
