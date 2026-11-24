const SAFE_LINK = /^\/(?!\/)[\w\-./?=&%#:@+~]*$/;
const MAX_LINK_LENGTH = 2048;

export function isSafeLink(link: string): boolean {
  return link.length <= MAX_LINK_LENGTH && SAFE_LINK.test(link);
}
