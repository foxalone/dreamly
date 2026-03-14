const DEFAULT_INVITE_TEXT =
  "Join me on Dreamly Chat — let’s share dreams and stories.";

function encode(value: string): string {
  return encodeURIComponent(value);
}

export function getChatInviteUrl(origin: string, inviterUid: string): string {
  return `${origin}/invite?from=${encode(inviterUid)}`;
}

export function getInviteMessage(): string {
  return DEFAULT_INVITE_TEXT;
}

export function getWhatsAppShareUrl(
  inviteUrl: string,
  text = DEFAULT_INVITE_TEXT
): string {
  return `https://wa.me/?text=${encode(`${text} ${inviteUrl}`)}`;
}

export function getTelegramShareUrl(
  inviteUrl: string,
  text = DEFAULT_INVITE_TEXT
): string {
  return `https://t.me/share/url?url=${encode(inviteUrl)}&text=${encode(text)}`;
}

export function getSmsShareUrl(
  inviteUrl: string,
  text = DEFAULT_INVITE_TEXT
): string {
  return `sms:?&body=${encode(`${text} ${inviteUrl}`)}`;
}

export async function copyInviteLink(inviteUrl: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(inviteUrl);
    return true;
  } catch {
    return false;
  }
}