const configuredValue = (value: string | undefined) => Boolean(value?.trim() && !/(your[_-]|example\.com|generate[_-]|placeholder)/i.test(value));

export function getContactConfiguration() {
  const required = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    process.env.TURNSTILE_SECRET_KEY,
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.CONTACT_RATE_LIMIT_HMAC_SECRET,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];
  return {
    ready: required.every(configuredValue) && (process.env.CONTACT_RATE_LIMIT_HMAC_SECRET?.length ?? 0) >= 32,
    notificationReady: [process.env.RESEND_API_KEY, process.env.CONTACT_NOTIFICATION_TO, process.env.CONTACT_NOTIFICATION_FROM].every(configuredValue),
    turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '',
  };
}
