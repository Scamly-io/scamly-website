
CREATE OR REPLACE FUNCTION public.articles_tsvector_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.search_vector :=
    to_tsvector('english',
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.content, '') || ' ' ||
      array_to_string(NEW.tags, ' ')
    );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_counts(uid uuid)
 RETURNS TABLE(scan_count bigint, conversation_count bigint, article_read_count bigint)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM scans WHERE user_id = uid),
    (SELECT COUNT(*) FROM chats WHERE user_id = uid),
    0::bigint;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_article_views(article_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  update articles
  set views = views + 1
  where id = article_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.message_belongs_to_user(msg_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM chats
    WHERE id = msg_conversation_id
    AND user_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.search_articles(search_text text)
 RETURNS TABLE(id uuid, slug text, title text, description text, content text, image text, quick_tip boolean, quick_tip_icon text, quick_tip_icon_colour text, quick_tip_icon_background_colour text, rank real)
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT 
    a.id,
    a.slug,
    a.title,
    a.description,
    a.content,
    a.primary_image,
    a.quick_tip,
    a.quick_tip_icon,
    a.quick_tip_icon_colour,
    a.quick_tip_icon_background_colour,
    ts_rank(a.search_vector, plainto_tsquery('english', search_text)) AS rank
  FROM articles a
  WHERE a.search_vector @@ plainto_tsquery('english', search_text)
  ORDER BY rank DESC
  LIMIT 3;
$function$;
