CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
begin
  insert into public.profiles (
    id,
    first_name,
    dob,
    country,
    gender,
    referral_source,
    onboarding_completed
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
    )
  );

  return new;
end;
$$;