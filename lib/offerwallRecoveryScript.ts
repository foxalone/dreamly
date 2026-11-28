/** Runs before AdSense so restoring a completed receipt cannot start another ad.
 * Uses Google's documented message-type suppression; consent remains enabled.
 */
export const OFFERWALL_RECOVERY_SCRIPT = `(() => {
  if (location.pathname !== "/ad/unlock") return;
  let recover = false;
  try {
    const pending = JSON.parse(sessionStorage.getItem("dreamly.adUnlock") || "null");
    const session = JSON.parse(sessionStorage.getItem("dreamly.offerwallSession") || "null");
    if (pending?.kind === "analysis" && typeof pending.atMs === "number" && Date.now() - pending.atMs <= 600000) {
      const entitlement = document.cookie.split(";").map(part => part.trim()).find(part => part.startsWith("FCOEC="))?.slice(6);
      recover = pending.ready === true || Boolean(session && session.pendingAtMs === pending.atMs &&
        session.dreamText === (pending.dreamText || "") && session.dreamId === pending.dreamId &&
        (session.status === "granted" || (session.status === "completed" && entitlement && entitlement !== session.initialEntitlement)));
    }
  } catch {}
  if (!recover) return;
  window.googlefc = window.googlefc || {};
  window.googlefc.controlledMessagingFunction = message => {
    const offerwall = window.googlefc.MessageTypeEnum?.OFFERWALL;
    if (offerwall !== undefined) message.proceed(false, [offerwall]);
    else message.proceed(true);
  };
})();`;
