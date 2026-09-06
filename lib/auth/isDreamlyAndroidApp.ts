export function isDreamlyAndroidApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return /DreamlyAndroid/i.test(navigator.userAgent || "");
}
