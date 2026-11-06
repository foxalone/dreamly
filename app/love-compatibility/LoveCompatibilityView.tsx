"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import { formatMessage } from "@/lib/i18n/messages";
import { loveCompatibilityCopy, loveMatchAiCopy, RELATIONSHIP_STATUSES, type RelationshipStatus } from "@/lib/i18n/love-compatibility";
import { horoscopeCopy } from "@/lib/i18n/horoscope";
import { SIGNS, SYMBOLS, type Sign } from "@/lib/horoscope/model";
import { lifePath, parseBirthDate, zodiacSign } from "@/lib/loveCompatibility";
import { LOVE_GENDERS, loveMatchCanonical, type AiLoveMatch, type LoveGender, type LoveMatchInput } from "@/lib/loveMatchAi";
import { loveMatchInitial, readSavedLoveMatch, removeSavedLoveMatch, writeSavedLoveMatch } from "@/lib/loveMatchSaved";
import { clearLoveMatchPending, clearLoveMatchPurchaseOrder, peekLoveMatchPending, peekLoveMatchPurchaseOrder, saveLoveMatchPending } from "@/lib/loveMatchAd";
import { localePath } from "@/lib/i18n/path";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { signInWithOptions } from "@/lib/auth/signInWithOptions";
import { ensureUserProfileOnSignIn } from "@/lib/auth/ensureUserProfile";
import { FaCamera, FaFemale, FaMale } from "react-icons/fa";
import DreamDictionaryHeader from "@/app/dreams/DreamDictionaryHeader";
import DreamAnalysisProgress from "@/app/components/DreamAnalysisProgress";
import PlansModal from "@/app/components/PlansModal";
import styles from "./LoveCompatibilityView.module.css";

type Submission = {
  you: string; them: string; firstBirthday: string; secondBirthday: string;
  input: LoveMatchInput;
  match: AiLoveMatch;
};

function cachedMatchHoldMs() {
  return 3000 + Math.floor(Math.random() * 1001);
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type InitialFlight = { id: string; you: string; them: string; x: number; y: number; dx: number; dy: number };

function LoveInitialFlight({ flight, onDone }: { flight: InitialFlight; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const animation = node.animate(
      [
        { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
        { transform: `translate(${flight.dx}px, ${flight.dy}px) scale(0.28)`, opacity: 0 },
      ],
      { duration: 1050, easing: "cubic-bezier(0.22, 0.7, 0.2, 1)", fill: "forwards" },
    );
    animation.onfinish = () => onDoneRef.current();
    return () => animation.cancel();
  }, [flight]);
  return <div ref={ref} className={styles.flight} style={{ left: flight.x, top: flight.y }} aria-hidden="true"><span>{flight.you}</span><span>{flight.them}</span></div>;
}

const accountSaves = new Map<string, Promise<boolean>>();

async function saveLoveMatchToAccount(idToken: string, input: LoveMatchInput, match: AiLoveMatch): Promise<boolean> {
  const id = loveMatchCanonical(input);
  const current = accountSaves.get(id);
  if (current) return current;
  const job = (async () => {
    const response = await fetch("/api/love-compatibility/save", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, input, match }),
    });
    return response.ok;
  })();
  accountSaves.set(id, job);
  try { return await job; } finally { accountSaves.delete(id); }
}

async function preparePhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8 * 1024 * 1024 || !file.size) {
    throw new Error("Unsupported photo");
  }
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare photo");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let photo = canvas.toDataURL("image/jpeg", 0.78);
    if (photo.length > 900_000) photo = canvas.toDataURL("image/jpeg", 0.5);
    if (photo.length > 900_000) throw new Error("Photo is too large");
    return photo;
  } finally { bitmap.close(); }
}

function SignName({ sign, locale }: { sign: Sign; locale: Locale }) {
  return <span>{SYMBOLS[SIGNS.indexOf(sign)]} {horoscopeCopy[locale].signs[sign]}</span>;
}

export default function LoveCompatibilityView({ locale, today }: { locale: Locale; today: string }) {
  const copy = useMemo(() => ({ ...loveCompatibilityCopy[locale], ...loveMatchAiCopy[locale] }), [locale]);
  const [you, setYou] = useState("");
  const [them, setThem] = useState("");
  const [firstBirthday, setFirstBirthday] = useState("");
  const [secondBirthday, setSecondBirthday] = useState("");
  const [status, setStatus] = useState<RelationshipStatus>("curious");
  const [firstGender, setFirstGender] = useState<LoveGender | null>(null);
  const [secondGender, setSecondGender] = useState<LoveGender | null>(null);
  const [firstStory, setFirstStory] = useState("");
  const [secondStory, setSecondStory] = useState("");
  const [firstPhoto, setFirstPhoto] = useState<string | null>(null);
  const [secondPhoto, setSecondPhoto] = useState<string | null>(null);
  const [firstPhotoBusy, setFirstPhotoBusy] = useState(false);
  const [secondPhotoBusy, setSecondPhotoBusy] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [error, setError] = useState("");
  const [photoDialogError, setPhotoDialogError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [pendingInput, setPendingInput] = useState<LoveMatchInput | null>(null);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [purchaseOptions, setPurchaseOptions] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [localSaved, setLocalSaved] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [userUid, setUserUid] = useState<string | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [flights, setFlights] = useState<InitialFlight[]>([]);
  const accessRef = useRef<HTMLElement>(null);
  const photoDialogRef = useRef<HTMLDialogElement>(null);
  const match = submission?.match;

  useEffect(() => {
    if (photoDialogError && !photoDialogRef.current?.open) photoDialogRef.current?.showModal();
  }, [photoDialogError]);

  useEffect(() => {
    if (submission) resultRef.current?.focus({ preventScroll: false });
  }, [submission]);

  useEffect(() => {
    if (accessOpen) accessRef.current?.focus({ preventScroll: false });
  }, [accessOpen]);

  useEffect(() => onAuthStateChanged(auth, user => setUserUid(user?.uid ?? null)), []);

  useEffect(() => {
    if (!submission) return;
    const stored = readSavedLoveMatch(userUid);
    const same = !!stored && loveMatchCanonical(stored.input) === loveMatchCanonical(submission.input);
    setLocalSaved(same);
    setSaved(same && stored?.accountSaved === true);
  }, [submission, userUid]);

  const runMatch = useCallback(async (input: LoveMatchInput, adChallenge?: string, purchaseOrderId?: string) => {
    const started = Date.now();
    const holdMs = cachedMatchHoldMs();
    setError("");
    setPhotoDialogError(null);
    setAccessOpen(false);
    setSubmission(null);
    setLoading(true);
    try {
      await auth.authStateReady();
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/love-compatibility", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, idToken, adChallenge, purchaseOrderId }),
      });
      if (response.status === 402) {
        if (adChallenge || purchaseOrderId) clearLoveMatchPending();
        if (purchaseOrderId) clearLoveMatchPurchaseOrder();
        setPendingInput(input);
        setAccessOpen(true);
        return;
      }
      if (!response.ok) {
        const failure = await response.json().catch(() => ({})) as { error?: string };
        const invalidPhoto = failure.error === "INVALID_PHOTO_FIRST" ? copy.yourPhotoInvalid
          : failure.error === "INVALID_PHOTO_SECOND" ? copy.theirPhotoInvalid : null;
        setError(invalidPhoto ?? (failure.error === "RATE_LIMITED" ? copy.rateError : copy.aiError));
        if (invalidPhoto) setPhotoDialogError(invalidPhoto);
        if (response.status === 422 && !purchaseOrderId) clearLoveMatchPending();
        return;
      }
      const data = await response.json() as { match?: AiLoveMatch; cached?: boolean };
      if (!data.match) throw new Error("Missing match");
      if (data.cached) {
        const remaining = holdMs - (Date.now() - started);
        if (remaining > 0) await wait(remaining);
      }
      setSubmission({ you: input.you, them: input.them, firstBirthday: input.firstBirthday, secondBirthday: input.secondBirthday, input, match: data.match });
      setSaved(false);
      clearLoveMatchPending();
      if (purchaseOrderId) clearLoveMatchPurchaseOrder();
    } catch { setError(copy.aiError); }
    finally { setLoading(false); }
  }, [copy]);

  useEffect(() => {
    const pending = peekLoveMatchPending();
    if (!pending) return;
    const input = pending.input;
    setYou(input.you); setThem(input.them);
    setFirstBirthday(input.firstBirthday); setSecondBirthday(input.secondBirthday);
    setFirstGender(input.firstGender); setSecondGender(input.secondGender);
    setFirstStory(input.firstStory); setSecondStory(input.secondStory);
    setFirstPhoto(input.firstPhoto || null); setSecondPhoto(input.secondPhoto || null);
    setStatus(input.status);
    if (pending.ready && (pending.challenge || pending.purchaseOrderId)) {
      void runMatch(input, pending.challenge, pending.purchaseOrderId);
    } else if (pending.challenge) setError(copy.adUnavailable);
  }, [copy, runMatch]);

  async function choosePhoto(file: File | undefined, person: "first" | "second") {
    if (!file) return;
    const setBusy = person === "first" ? setFirstPhotoBusy : setSecondPhotoBusy;
    setBusy(true);
    setError("");
    try {
      const prepared = await preparePhoto(file);
      (person === "first" ? setFirstPhoto : setSecondPhoto)(prepared);
    } catch { setError(copy.photoError); }
    finally { setBusy(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || firstPhotoBusy || secondPhotoBusy) return;
    if (!firstGender || !secondGender) { setError(copy.genderError); return; }
    if (!parseBirthDate(firstBirthday) || !parseBirthDate(secondBirthday) || firstBirthday > today || secondBirthday > today) {
      setError(copy.dateError);
      return;
    }
    const input: LoveMatchInput = {
      locale, you: you.trim() || copy.youFallback, them: them.trim() || copy.themFallback,
      firstBirthday, secondBirthday, firstGender, secondGender,
      firstStory: firstStory.trim(), secondStory: secondStory.trim(), firstPhoto, secondPhoto, status,
    };
    const pending = peekLoveMatchPending();
    const retryChallenge = pending?.ready && pending.challenge && JSON.stringify(pending.input) === JSON.stringify(input)
      ? pending.challenge : undefined;
    const retryPurchase = pending?.ready && pending.purchaseOrderId
      ? pending.purchaseOrderId : peekLoveMatchPurchaseOrder() ?? undefined;
    await runMatch(input, retryChallenge, retryPurchase);
  }

  async function watchAd() {
    if (!pendingInput || unlockBusy) return;
    setUnlockBusy(true);
    try {
      const response = await fetch("/api/love-compatibility/ad", {
        method: "POST", headers: { "Content-Type": "application/json", "x-love-match-request": "1" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!response.ok) throw new Error("Ad unavailable");
      const { challenge } = await response.json() as { challenge: string };
      if (!saveLoveMatchPending(pendingInput, challenge)) throw new Error("Could not preserve form");
      const params = new URLSearchParams({ kind: "love-match", challenge, next: window.location.pathname, locale });
      window.location.assign(`/ad/unlock?${params}`);
    } catch { setError(copy.adUnavailable); setAccessOpen(true); setPurchaseOptions(true); setUnlockBusy(false); }
  }

  function subscribe() {
    if (pendingInput && !saveLoveMatchPending(pendingInput)) {
      setError(copy.aiError);
      setAccessOpen(false);
      return;
    }
    window.location.assign(localePath("/app/upgrade", locale));
  }

  function saveOnDevice() {
    if (!submission || localSaved) return;
    const existing = readSavedLoveMatch(userUid);
    const same = !!existing && loveMatchCanonical(existing.input) === loveMatchCanonical(submission.input);
    const ok = writeSavedLoveMatch(userUid, { input: submission.input, match: submission.match, accountSaved: same ? existing.accountSaved : false });
    if (!ok) { setSaveError(copy.saveError); return; }
    setLocalSaved(true);
    setSaveError("");
    launchInitials(submission.you, submission.them);
  }

  function launchInitials(you: string, them: string) {
    const button = saveButtonRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = ["[data-love-crystal]", "[data-profile-target]"]
      .map(selector => document.querySelector(selector))
      .filter((node): node is Element => !!node && node.getBoundingClientRect().width > 0);
    if (!button || reduce || targets.length === 0) {
      window.dispatchEvent(new CustomEvent("dreamly:love-saved"));
      return;
    }
    const from = button.getBoundingClientRect();
    const width = 78;
    const letters = { you: loveMatchInitial(you), them: loveMatchInitial(them) };
    setFlights(targets.map((node, index) => {
      const to = node.getBoundingClientRect();
      const x = from.left + from.width / 2 - width / 2 + index * 8;
      const y = from.top + from.height / 2 - 23;
      return {
        id: node.hasAttribute("data-love-crystal") ? "crystal" : "profile",
        ...letters, x, y,
        dx: to.left + to.width / 2 - width / 2 - x,
        dy: to.top + to.height / 2 - 23 - y,
      };
    }));
  }

  const finishFlight = useCallback((id: string) => {
    setFlights(current => {
      const next = current.filter(item => item.id !== id);
      if (current.some(item => item.id === id) && next.length === 0) {
        window.dispatchEvent(new CustomEvent("dreamly:love-saved"));
        for (const selector of ["[data-profile-target]"]) {
          const node = document.querySelector(selector);
          node?.classList.add("love-target-caught");
          window.setTimeout(() => node?.classList.remove("love-target-caught"), 700);
        }
      }
      return next;
    });
  }, []);

  async function saveToAccount() {
    if (!submission || saveBusy || saved) return;
    setSaveBusy(true);
    setSaveError("");
    try {
      if (writeSavedLoveMatch(userUid, { input: submission.input, match: submission.match, accountSaved: false })) setLocalSaved(true);
      await auth.authStateReady();
      let user = auth.currentUser;
      if (!user) {
        const credential = await signInWithOptions();
        if (!credential) return;
        user = credential.user;
        await ensureUserProfileOnSignIn(user);
      }
      const ok = await saveLoveMatchToAccount(await user.getIdToken(), submission.input, submission.match);
      if (!ok) throw new Error("Save failed");
      writeSavedLoveMatch(user.uid, { input: submission.input, match: submission.match, accountSaved: true });
      if (!userUid) removeSavedLoveMatch(null, submission.input);
      setSaved(true);
    } catch { setSaveError(copy.saveError); }
    finally { setSaveBusy(false); }
  }

  return <>
  <DreamAnalysisProgress active={loading} title={copy.loading} body={copy.loadingBody} />
  {flights.map(flight => createPortal(<LoveInitialFlight key={flight.id} flight={flight} onDone={() => finishFlight(flight.id)} />, document.body))}
  {photoDialogError && createPortal(<dialog ref={photoDialogRef} className={styles.photoDialog} aria-labelledby="love-photo-error-title" aria-describedby="love-photo-error-message" onClose={() => setPhotoDialogError(null)} dir={locale === "ar" ? "rtl" : "ltr"}>
    <h2 id="love-photo-error-title">{copy.photoInvalidTitle}</h2>
    <p id="love-photo-error-message">{photoDialogError}</p>
    <button type="button" onClick={() => photoDialogRef.current?.close()}>{copy.photoInvalidDismiss}</button>
  </dialog>, document.body)}
  <DreamDictionaryHeader />
  <main className={styles.page} dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className={styles.shell}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
      </header>

      <form className={styles.form} onSubmit={submit} autoComplete="off" noValidate>
        <div className={styles.people}>
          <div className={styles.person} data-gender={firstGender || "unset"}>
            <div className={styles.personHead}>
              <div className={styles.personMark} aria-hidden="true">✦</div>
              <p id="love-you-gender" className={styles.personTitle}>{copy.yourGenderLabel}</p>
            </div>
            <fieldset className={styles.genderGroup} aria-labelledby="love-you-gender">
              <div className={styles.genderOptions}>{LOVE_GENDERS.map(gender => <label className={styles.genderOption} data-gender={gender} data-active={firstGender === gender} key={gender}>
                <input className={styles.genderRadio} type="radio" name="firstGender" value={gender} checked={firstGender === gender} onChange={() => setFirstGender(gender)} />
                <span className={styles.genderIcon} aria-hidden="true">{gender === "woman" ? <FaFemale /> : <FaMale />}</span>
                <span>{copy.genders[gender]}</span>
              </label>)}</div>
            </fieldset>
            <div className={styles.photoField}>
              <p>{copy.yourPhoto} <span>{copy.nameOptional}</span></p>
              <div className={styles.photoActions}>
                <label className={styles.photoPicker}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={copy.yourPhoto} disabled={loading || firstPhotoBusy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choosePhoto(file, "first"); }} />
                  <span className={styles.photoPreview}>{firstPhoto ? <Image src={firstPhoto} alt="" width={52} height={52} unoptimized /> : <FaCamera aria-hidden="true" />}</span>
                  <span>{firstPhotoBusy ? copy.photoProcessing : firstPhoto ? copy.changePhoto : copy.addPhoto}</span>
                </label>
                {firstPhoto && <button className={styles.removePhoto} type="button" onClick={() => setFirstPhoto(null)}>{copy.removePhoto}</button>}
              </div>
            </div>
            <label htmlFor="love-you-name">{copy.yourName} <span>{copy.nameOptional}</span></label>
            <input id="love-you-name" name="you" value={you} onChange={event => setYou(event.target.value)} maxLength={40} />
            <label htmlFor="love-you-birthday">{copy.yourBirthday}</label>
            <input id="love-you-birthday" name="firstBirthday" type="date" value={firstBirthday} onChange={event => setFirstBirthday(event.target.value)} max={today} required />
            <label htmlFor="love-you-story">{copy.yourStory} <span>{copy.nameOptional}</span></label>
            <textarea id="love-you-story" value={firstStory} onChange={event => setFirstStory(event.target.value)} maxLength={800} rows={4} placeholder={copy.yourStoryHint} />
          </div>
          <span className={styles.join} aria-hidden="true">&</span>
          <div className={styles.person} data-gender={secondGender || "unset"}>
            <div className={styles.personHead}>
              <div className={styles.personMark} aria-hidden="true">✧</div>
              <p id="love-them-gender" className={styles.personTitle}>{copy.theirGenderLabel}</p>
            </div>
            <fieldset className={styles.genderGroup} aria-labelledby="love-them-gender">
              <div className={styles.genderOptions}>{LOVE_GENDERS.map(gender => <label className={styles.genderOption} data-gender={gender} data-active={secondGender === gender} key={gender}>
                <input className={styles.genderRadio} type="radio" name="secondGender" value={gender} checked={secondGender === gender} onChange={() => setSecondGender(gender)} />
                <span className={styles.genderIcon} aria-hidden="true">{gender === "woman" ? <FaFemale /> : <FaMale />}</span>
                <span>{copy.genders[gender]}</span>
              </label>)}</div>
            </fieldset>
            <div className={styles.photoField}>
              <p>{copy.theirPhoto} <span>{copy.nameOptional}</span></p>
              <div className={styles.photoActions}>
                <label className={styles.photoPicker}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={copy.theirPhoto} disabled={loading || secondPhotoBusy} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choosePhoto(file, "second"); }} />
                  <span className={styles.photoPreview}>{secondPhoto ? <Image src={secondPhoto} alt="" width={52} height={52} unoptimized /> : <FaCamera aria-hidden="true" />}</span>
                  <span>{secondPhotoBusy ? copy.photoProcessing : secondPhoto ? copy.changePhoto : copy.addPhoto}</span>
                </label>
                {secondPhoto && <button className={styles.removePhoto} type="button" onClick={() => setSecondPhoto(null)}>{copy.removePhoto}</button>}
              </div>
            </div>
            <label htmlFor="love-them-name">{copy.theirName} <span>{copy.nameOptional}</span></label>
            <input id="love-them-name" name="them" value={them} onChange={event => setThem(event.target.value)} maxLength={40} />
            <label htmlFor="love-them-birthday">{copy.theirBirthday}</label>
            <input id="love-them-birthday" name="secondBirthday" type="date" value={secondBirthday} onChange={event => setSecondBirthday(event.target.value)} max={today} required />
            <label htmlFor="love-them-story">{copy.theirStory} <span>{copy.nameOptional}</span></label>
            <textarea id="love-them-story" value={secondStory} onChange={event => setSecondStory(event.target.value)} maxLength={800} rows={4} placeholder={copy.theirStoryHint} />
          </div>
        </div>

        <fieldset className={styles.statusGroup}>
          <legend>{copy.statusLabel}</legend>
          <div className={styles.statusOptions}>
            {RELATIONSHIP_STATUSES.map(value => <label className={styles.statusOption} data-active={status === value} key={value}>
              <input type="radio" name="status" value={value} checked={status === value} onChange={() => setStatus(value)} />
              {copy.statuses[value]}
            </label>)}
          </div>
        </fieldset>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button className={styles.reveal} type="submit" disabled={loading || firstPhotoBusy || secondPhotoBusy}>{firstPhotoBusy || secondPhotoBusy ? copy.photoProcessing : copy.reveal}<span aria-hidden="true"> ✨</span></button>
      </form>

      {accessOpen && <section className={styles.accessChoice} ref={accessRef} tabIndex={-1} aria-labelledby="love-access-title">
        <h2 id="love-access-title">{copy.accessTitle}</h2>
        <p>{copy.accessText}</p>
        <div className={styles.accessButtons}>
          <button type="button" onClick={() => void watchAd()} disabled={unlockBusy}>{copy.watchAd}</button>
          <button type="button" onClick={subscribe} disabled={unlockBusy}>{copy.subscribe}</button>
        </div>
      </section>}

      {submission && match && <section className={styles.result} ref={resultRef} tabIndex={-1} aria-labelledby="love-result-title">
        <div className={styles.resultHero}>
          <div>
            <p className={styles.eyebrow}>{copy.resultEyebrow}</p>
            <h2 id="love-result-title">{formatMessage(copy.resultTitle, { you: submission.you, them: submission.them })}</h2>
            <div className={styles.profiles}>
              <span>{copy.yourSign}: <SignName sign={zodiacSign(submission.firstBirthday)!} locale={locale} /></span>
              <span>{copy.theirSign}: <SignName sign={zodiacSign(submission.secondBirthday)!} locale={locale} /></span>
              <span>{formatMessage(copy.lifePath, { number: lifePath(submission.firstBirthday)! })}</span>
              <span>{formatMessage(copy.lifePath, { number: lifePath(submission.secondBirthday)! })}</span>
            </div>
          </div>
          <div className={styles.scoreDial} style={{ "--score": `${match.overall}%` } as CSSProperties} aria-label={`${copy.overallMatch}: ${match.overall}%`}>
            <strong>{match.overall}%</strong><span>{copy.overallMatch}</span>
          </div>
        </div>

        <div className={styles.summary}><h3>{copy.summaryTitle}</h3><p>{match.summary}</p></div>
        <h3>{copy.dimensionsTitle}</h3>
        <div className={styles.dimensions}>
          {match.scores.map(item => <div className={styles.dimension} key={item.dimension}>
            <div className={styles.dimensionLine}><span>{copy.dimensions[item.dimension]}</span><strong>{item.score}%</strong></div>
            <div className={styles.track} role="meter" aria-label={copy.dimensions[item.dimension]} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.score}>
              <span style={{ width: `${item.score}%` }} />
            </div>
          </div>)}
        </div>

        <div className={styles.insights}>
          <article><span aria-hidden="true">✦</span><h3>{copy.strengthTitle}</h3><p>{match.strength}</p></article>
          <article><span aria-hidden="true">◇</span><h3>{copy.growthTitle}</h3><p>{match.growth}</p></article>
        </div>
        <div className={styles.reflection}><h3>{copy.reflectionTitle}</h3><p>{match.reflection}</p></div>
        <div className={styles.saveRow}>
          <button ref={saveButtonRef} className={styles.saveButton} type="button" onClick={saveOnDevice} disabled={localSaved}>{localSaved ? copy.savedLocal : copy.saveLocal}</button>
          <button className={styles.restart} type="button" onClick={() => setSubmission(null)}>{copy.startOver}</button>
          <button className={styles.saveButton} type="button" onClick={() => void saveToAccount()} disabled={saveBusy || saved}>{saveBusy ? copy.saving : saved ? copy.saved : userUid ? copy.saveToAccount : copy.saveSignIn}</button>
          {saveError && <p className={styles.saveError} role="alert">{saveError}</p>}
        </div>
      </section>}
    </div>
  </main>
  <PlansModal
    open={purchaseOptions}
    onClose={() => setPurchaseOptions(false)}
    source="love_match_ad_unavailable"
    title={copy.accessTitle}
    body={copy.adUnavailable}
    oneTime={{ kind: "love-match", next: localePath("/love-compatibility", locale), onStart: () => pendingInput ? saveLoveMatchPending(pendingInput) : false }}
  />
  </>;
}
